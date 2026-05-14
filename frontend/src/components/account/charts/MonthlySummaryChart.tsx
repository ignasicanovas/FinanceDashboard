import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useMonthlySummary } from '@/hooks/useStats'
import { formatCurrency } from '@/lib/utils'
import type { DrilldownTarget } from '../TransactionDrilldown'

function monthRange(mes: string) {
  const [year, month] = mes.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return { fecha_desde: `${mes}-01`, fecha_hasta: `${mes}-${String(lastDay).padStart(2, '0')}` }
}

interface Props {
  accountId: number
  fechaDesde?: string
  fechaHasta?: string
  area?: string
  categoria?: string
  tag?: string
  desdeAhorro?: number
  onDrilldown?: (target: DrilldownTarget) => void
}

export default function MonthlySummaryChart({ accountId, fechaDesde, fechaHasta, area, categoria, tag, desdeAhorro, onDrilldown }: Props) {
  const { data = [], isLoading } = useMonthlySummary(accountId, { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, area, categoria, tag, desde_ahorro: desdeAhorro })

  if (isLoading) return <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
  if (!data.length) return <p className="text-sm text-gray-400 text-center py-8">Sin datos para el período seleccionado</p>

  const totalGastos = data.reduce((s, d) => s + d.gastos, 0)

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Ingresos vs Gastos mensuales</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`} tick={{ fontSize: 11 }} />
          <Tooltip formatter={(value) => formatCurrency(value as number)} />
          <Legend />
          <Bar
            dataKey="ingresos"
            name="Ingresos"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
            style={onDrilldown ? { cursor: 'pointer' } : undefined}
            onClick={(d: any) => onDrilldown?.({ title: `Ingresos ${d.mes}`, accountId, filters: { ...monthRange(d.mes), area, categoria, tag } })}
          />
          <Bar
            dataKey="gastos"
            name="Gastos"
            fill="#f87171"
            radius={[4, 4, 0, 0]}
            style={onDrilldown ? { cursor: 'pointer' } : undefined}
            onClick={(d: any) => onDrilldown?.({ title: `Gastos ${d.mes}`, accountId, filters: { ...monthRange(d.mes), area, categoria, tag } })}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="flex justify-end mt-2">
        <span className="text-xs text-gray-400">Total gastos: <span className="font-semibold text-gray-600">{formatCurrency(totalGastos)}</span></span>
      </div>
    </div>
  )
}
