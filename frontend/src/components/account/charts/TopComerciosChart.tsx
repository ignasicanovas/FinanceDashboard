import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useTopComercios } from '@/hooks/useStats'
import { formatCurrency } from '@/lib/utils'
import type { DrilldownTarget } from '../TransactionDrilldown'

interface Props {
  accountId: number
  fechaDesde?: string
  fechaHasta?: string
  area?: string
  categoria?: string
  tag?: string
  onDrilldown?: (target: DrilldownTarget) => void
}

const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#84cc16', '#22c55e']

export default function TopComerciósChart({ accountId, fechaDesde, fechaHasta, area, categoria, tag, onDrilldown }: Props) {
  const { data = [], isLoading } = useTopComercios(accountId, {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    area,
    categoria,
    tag,
  })

  if (isLoading) return <div className="h-48 bg-gray-50 rounded-xl animate-pulse" />
  if (!data.length) return null

  const height = Math.max(200, data.length * 38)
  const total = data.reduce((s, d) => s + d.gasto, 0)

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 10 establecimientos por gasto</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(1)}k€`}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            width={140}
            tick={{ fontSize: 11 }}
            tickFormatter={(v: string) => v.length > 20 ? v.slice(0, 19) + '…' : v}
          />
          <Tooltip
            formatter={(value) => [formatCurrency(value as number), 'Gasto']}
            labelFormatter={(label) => label}
          />
          <Bar
            dataKey="gasto"
            radius={[0, 4, 4, 0]}
            style={onDrilldown ? { cursor: 'pointer' } : undefined}
            onClick={(d: any) => onDrilldown?.({ title: d.nombre, accountId, filters: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, area, categoria, tag, search: d.nombre } })}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
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
