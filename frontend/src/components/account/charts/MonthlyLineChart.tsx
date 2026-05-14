import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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

export default function MonthlyLineChart({ accountId, fechaDesde, fechaHasta, area, categoria, tag, desdeAhorro, onDrilldown }: Props) {
  const { data = [], isLoading } = useMonthlySummary(accountId, {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    area,
    categoria,
    tag,
    desde_ahorro: desdeAhorro,
  })

  if (isLoading) return <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
  if (!data.length) return null

  const chartData = data.map((d) => ({
    mes: d.mes,
    Ingresos: d.ingresos,
    Gastos: d.gastos,
  }))
  const totalGastos = data.reduce((s, d) => s + d.gastos, 0)

  return (
    <div className="bg-white rounded-xl border p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Evolución ingresos / gastos</h3>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart
          data={chartData}
          margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          style={onDrilldown ? { cursor: 'pointer' } : undefined}
          onClick={(chartData) => {
            if (!onDrilldown || !chartData?.activeLabel) return
            const mes = chartData.activeLabel as string
            onDrilldown({ title: mes, accountId, filters: { ...monthRange(mes), area, categoria, tag } })
          }}
        >
          <defs>
            <linearGradient id="gradIngresos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradGastos" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f87171" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="mes" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${(v / 1000).toFixed(0)}k€`}
            width={44}
          />
          <Tooltip formatter={(value) => formatCurrency(value as number)} />
          <Legend />
          <Area
            type="monotone"
            dataKey="Ingresos"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#gradIngresos)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="Gastos"
            stroke="#f87171"
            strokeWidth={2}
            fill="url(#gradGastos)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex justify-end mt-2">
        <span className="text-xs text-gray-400">Total gastos: <span className="font-semibold text-gray-600">{formatCurrency(totalGastos)}</span></span>
      </div>
    </div>
  )
}
