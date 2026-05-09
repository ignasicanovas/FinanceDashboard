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
        const isIncome = kpi.tipo === 'ingreso'
        const isBalance = kpi.tipo === 'balance' || kpi.tipo === 'personalizado'
        const valueColor = isBalance
          ? value >= 0 ? 'var(--nf-pos)' : 'var(--nf-neg)'
          : isIncome ? 'var(--nf-pos)' : 'var(--nf-ink-2)'

        return (
          <button
            key={kpi.id}
            onClick={() => onDrilldown?.({
              title: `${kpi.emoji} ${kpi.label}`,
              accountId,
              kpiId: kpi.id,
              filters: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta, area, categoria, tag },
            })}
            className="flex-shrink-0 min-w-[148px] rounded-2xl p-4 text-left transition-all"
            style={{
              background: 'var(--nf-paper)',
              border: '1px solid var(--nf-rule)',
              cursor: onDrilldown ? 'pointer' : 'default',
            }}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-base leading-none">{kpi.emoji}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--nf-ink-3)' }}>
                {kpi.label}
              </span>
            </div>
            <p className="text-xl font-bold nf-mono" style={{ color: valueColor, letterSpacing: '-0.02em' }}>
              {kpi.tipo === 'gasto' || kpi.tipo === 'ahorro' ? '−' : kpi.tipo === 'ingreso' ? '+' : kpi.tipo === 'personalizado' ? (value >= 0 ? '+' : '−') : ''}
              {formatCurrency(Math.abs(value))}
            </p>
          </button>
        )
      })}
    </div>
  )
}
