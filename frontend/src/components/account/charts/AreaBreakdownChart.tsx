import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import { useByArea } from '@/hooks/useStats'
import { formatCurrency } from '@/lib/utils'
import type { DrilldownTarget } from '../TransactionDrilldown'

const AREA_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
]

interface Props {
  accountId: number
  fechaDesde?: string
  fechaHasta?: string
  area?: string
  categoria?: string
  tag?: string
  onDrilldown?: (target: DrilldownTarget) => void
}

export default function AreaBreakdownChart({ accountId, fechaDesde, fechaHasta, area, categoria, tag, onDrilldown }: Props) {
  const { data = [], isLoading } = useByArea(accountId, { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, area, categoria, tag })

  const expenses = data.filter((d) => d.neto < 0).map((d) => ({
    ...d,
    gasto: Math.abs(d.neto),
  }))

  if (isLoading) return <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
  if (!expenses.length) return <p className="text-sm text-gray-400 text-center py-6">Sin datos de áreas</p>

  const total = expenses.reduce((s, d) => s + d.gasto, 0)

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Gastos por área</h3>
      <ResponsiveContainer width="100%" height={Math.max(180, expenses.length * 40)}>
        <BarChart data={expenses} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis type="number" tickFormatter={(v) => `${v}€`} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="area" tick={{ fontSize: 12 }} width={80} />
          <Tooltip formatter={(value) => formatCurrency(value as number)} />
          <Bar
            dataKey="gasto"
            radius={[0, 4, 4, 0]}
            style={onDrilldown ? { cursor: 'pointer' } : undefined}
            onClick={(data: any) => onDrilldown?.({ title: `Área: ${data.area}`, accountId, filters: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, area: data.area, categoria, tag } })}
          >
            {expenses.map((_, index) => (
              <Cell key={index} fill={AREA_COLORS[index % AREA_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-end mt-2">
        <span className="text-xs text-gray-400">Total: <span className="font-semibold text-gray-600">{formatCurrency(total)}</span></span>
      </div>
    </div>
  )
}
