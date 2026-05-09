import { Link } from 'react-router-dom'
import { Upload, AlertCircle } from 'lucide-react'
import { useAccountStats } from '@/hooks/useAccounts'
import { formatCurrency } from '@/lib/utils'
import type { Account } from '@/types'

interface AccountCardProps {
  account: Account
  onUpload: (account: Account) => void
}

export default function AccountCard({ account, onUpload }: AccountCardProps) {
  const { data: stats } = useAccountStats(account.id)

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all group"
      style={{ background: 'var(--nf-paper)', border: '1px solid var(--nf-rule)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <Link to={`/account/${account.id}`} className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl leading-none flex-shrink-0">{account.emoji}</span>
          <div className="min-w-0">
            <p
              className="text-sm font-semibold truncate transition-colors group-hover:text-[var(--nf-accent)]"
              style={{ color: 'var(--nf-ink)' }}
            >
              {account.nombre}
            </p>
            {account.banco && (
              <p className="text-xs truncate" style={{ color: 'var(--nf-ink-3)' }}>{account.banco}</p>
            )}
          </div>
        </Link>
        {!!stats?.total_sin_cat && (
          <span
            className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2"
            style={{ background: 'oklch(30% 0.1 55)', color: 'oklch(85% 0.12 65)' }}
          >
            <AlertCircle className="w-3 h-3" />
            {stats.total_sin_cat} sin cat.
          </span>
        )}
      </div>

      {/* Balance + month stats */}
      {stats?.ok ? (
        <div className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: 'var(--nf-ink-3)' }}>
              Saldo total
            </p>
            <p
              className="text-2xl font-bold nf-mono"
              style={{ color: stats.balance >= 0 ? 'var(--nf-pos)' : 'var(--nf-neg)', letterSpacing: '-0.02em' }}
            >
              {formatCurrency(stats.balance)}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl px-3 py-2" style={{ background: 'var(--nf-surface-2)' }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: 'var(--nf-ink-3)' }}>
                Ingresos · {stats.mes_label}
              </p>
              <p className="text-sm font-semibold nf-mono" style={{ color: 'var(--nf-pos)' }}>
                +{formatCurrency(stats.mes_ingresos)}
              </p>
            </div>
            <div className="rounded-xl px-3 py-2" style={{ background: 'var(--nf-surface-2)' }}>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-0.5" style={{ color: 'var(--nf-ink-3)' }}>
                Gastos · {stats.mes_label}
              </p>
              <p className="text-sm font-semibold nf-mono" style={{ color: 'var(--nf-neg)' }}>
                -{formatCurrency(stats.mes_gastos)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm italic py-2" style={{ color: 'var(--nf-ink-3)' }}>Sin transacciones</p>
      )}

      {/* Upload button */}
      <button
        onClick={() => onUpload(account)}
        className="flex items-center justify-center gap-2 text-xs font-semibold py-2.5 rounded-xl transition-all mt-auto hover:brightness-125"
        style={{ background: 'var(--nf-surface-2)', color: 'var(--nf-ink-2)' }}
      >
        <Upload className="w-3.5 h-3.5" />
        Cargar extracto
      </button>
    </div>
  )
}
