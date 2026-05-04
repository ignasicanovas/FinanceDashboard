import { useKpis } from '@/hooks/useKpis'
import { useKpiValues } from '@/hooks/useStats'
import { formatCurrency } from '@/lib/utils'
import type { DrilldownTarget } from './TransactionDrilldown'

interface KpiBarProps {
  accountId: number
  fechaDesde?: string
  fechaHasta?: string
  area?: string
  categoria?: string
  tag?: string
  onDrilldown?: (target: DrilldownTarget) => void
}

export default function KpiBar({ accountId, fechaDesde, fechaHasta, area, categoria, tag, onDrilldown }: KpiBarProps) {
  const { data: kpis = [] } = useKpis(accountId)
  const { data: values = {} } = useKpiValues(accountId, {
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
    area,
    categoria,
    tag,
  })

  if (kpis.length === 0) return null

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {kpis.map((kpi) => {
        const value = values[kpi.id] ?? 0
        const colorClass =
          kpi.tipo === 'balance'
            ? value >= 0
              ? 'text-green-700 bg-green-50 border-green-200'
              : 'text-red-600 bg-red-50 border-red-200'
            : kpi.tipo === 'ingreso'
            ? 'text-green-700 bg-green-50 border-green-200'
            : 'text-gray-700 bg-white border-gray-200'

        return (
          <button
            key={kpi.id}
            onClick={() => onDrilldown?.({ title: `${kpi.emoji} ${kpi.label}`, accountId, kpiId: kpi.id, filters: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, area, categoria, tag } })}
            className={`flex-shrink-0 min-w-[140px] rounded-xl border p-4 text-left transition-shadow ${colorClass} ${onDrilldown ? 'hover:shadow-md cursor-pointer' : ''}`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-lg">{kpi.emoji}</span>
              <span className="text-xs font-medium text-gray-500 truncate">{kpi.label}</span>
            </div>
            <p className="text-xl font-bold tabular-nums">
              {kpi.tipo === 'gasto' || kpi.tipo === 'ahorro' ? '-' : kpi.tipo === 'ingreso' ? '+' : ''}
              {formatCurrency(Math.abs(value))}
            </p>
          </button>
        )
      })}
    </div>
  )
}
