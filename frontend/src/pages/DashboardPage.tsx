import { useState } from 'react'
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useQueries } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import AppShell from '@/components/layout/AppShell'
import AccountCard from '@/components/dashboard/AccountCard'
import UploadDialog from '@/components/dashboard/UploadDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { useAccounts, useCreateAccount } from '@/hooks/useAccounts'
import { accountsApi } from '@/api/accounts'
import { formatCurrency } from '@/lib/utils'
import type { Account } from '@/types'

function PatrimonioHero({ totalBalance, mesIngresos, mesGastos, mesLabel }: {
  totalBalance: number
  mesIngresos: number
  mesGastos: number
  mesLabel: string
}) {
  const netMes = mesIngresos - mesGastos
  const isPositive = netMes >= 0

  return (
    <div
      className="rounded-2xl p-7 mb-6"
      style={{ background: 'var(--nf-paper)', border: '1px solid var(--nf-rule)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: 'var(--nf-ink-3)' }}>
        Patrimonio total
      </p>
      <div className="flex items-end gap-4 mb-6">
        <p
          className="text-5xl font-bold nf-mono leading-none"
          style={{ color: 'var(--nf-ink)', letterSpacing: '-0.02em' }}
        >
          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(totalBalance)}
        </p>
        <div
          className="flex items-center gap-1 text-sm font-semibold pb-1"
          style={{ color: isPositive ? 'var(--nf-pos)' : 'var(--nf-neg)' }}
        >
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{isPositive ? '+' : ''}{formatCurrency(netMes)} este mes</span>
        </div>
      </div>

      {/* This month KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={{ background: 'var(--nf-surface-2)' }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--nf-ink-3)' }}>
            Ingresos · {mesLabel}
          </p>
          <p className="text-xl font-semibold nf-mono" style={{ color: 'var(--nf-pos)' }}>
            +{formatCurrency(mesIngresos)}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--nf-surface-2)' }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--nf-ink-3)' }}>
            Gastos · {mesLabel}
          </p>
          <p className="text-xl font-semibold nf-mono" style={{ color: 'var(--nf-neg)' }}>
            -{formatCurrency(mesGastos)}
          </p>
        </div>
        <div className="rounded-xl p-4" style={{ background: 'var(--nf-surface-2)' }}>
          <p className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: 'var(--nf-ink-3)' }}>
            Neto · {mesLabel}
          </p>
          <p
            className="text-xl font-semibold nf-mono"
            style={{ color: isPositive ? 'var(--nf-pos)' : 'var(--nf-neg)' }}
          >
            {isPositive ? '+' : ''}{formatCurrency(netMes)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: accounts = [], isLoading } = useAccounts()
  const [uploadTarget, setUploadTarget] = useState<Account | null>(null)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const createAccount = useCreateAccount()
  const { register, handleSubmit, reset } = useForm<{ nombre: string; banco: string; emoji: string }>({
    defaultValues: { nombre: '', banco: '', emoji: '🏦' },
  })

  // Fetch stats for all accounts in parallel to compute portfolio totals
  const statsQueries = useQueries({
    queries: accounts.map((acc) => ({
      queryKey: ['account', acc.id, 'stats'],
      queryFn: () => accountsApi.stats(acc.id),
      enabled: accounts.length > 0,
    })),
  })

  const allStatsReady = statsQueries.length > 0 && statsQueries.every((q) => q.isSuccess)
  const totalBalance = statsQueries.reduce((sum, q) => sum + (q.data?.balance ?? 0), 0)
  const mesIngresos = statsQueries.reduce((sum, q) => sum + (q.data?.mes_ingresos ?? 0), 0)
  const mesGastos = statsQueries.reduce((sum, q) => sum + (q.data?.mes_gastos ?? 0), 0)
  const mesLabel = statsQueries.find((q) => q.data?.mes_label)?.data?.mes_label ?? ''

  const onCreateAccount = async (data: { nombre: string; banco: string; emoji: string }) => {
    try {
      await createAccount.mutateAsync(data)
      toast.success('Cuenta creada correctamente')
      reset()
      setShowNewAccount(false)
    } catch {
      toast.error('Error al crear la cuenta')
    }
  }

  return (
    <AppShell title="Resumen">
      <div className="max-w-5xl mx-auto">
        {/* Portfolio hero */}
        {allStatsReady && accounts.length > 0 && (
          <PatrimonioHero
            totalBalance={totalBalance}
            mesIngresos={mesIngresos}
            mesGastos={mesGastos}
            mesLabel={mesLabel}
          />
        )}

        {/* Accounts section header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4" style={{ color: 'var(--nf-ink-3)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--nf-ink-2)' }}>
              {accounts.length} {accounts.length === 1 ? 'cuenta' : 'cuentas'}
            </h2>
          </div>
          <button
            onClick={() => setShowNewAccount(true)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ background: 'var(--nf-accent)', color: 'var(--nf-accent-ink)' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva cuenta
          </button>
        </div>

        {/* Account cards */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-2xl animate-pulse" style={{ background: 'var(--nf-paper)' }} />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--nf-ink-3)' }}>
            <div className="text-5xl mb-4">🏦</div>
            <p className="font-semibold mb-1" style={{ color: 'var(--nf-ink-2)' }}>Sin cuentas todavía</p>
            <p className="text-sm mb-5">Crea tu primera cuenta para empezar</p>
            <button
              onClick={() => setShowNewAccount(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--nf-accent)', color: 'var(--nf-accent-ink)' }}
            >
              <Plus className="w-4 h-4" />
              Crear cuenta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onUpload={setUploadTarget}
              />
            ))}
          </div>
        )}
      </div>

      <UploadDialog account={uploadTarget} onClose={() => setUploadTarget(null)} />

      <Dialog open={showNewAccount} onOpenChange={setShowNewAccount}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nueva cuenta</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreateAccount)} className="space-y-4">
            <div className="flex gap-2">
              <div className="w-20">
                <Label>Emoji</Label>
                <Input {...register('emoji')} className="text-center text-xl" />
              </div>
              <div className="flex-1">
                <Label>Nombre</Label>
                <Input {...register('nombre', { required: true })} placeholder="Ej: N26 personal" />
              </div>
            </div>
            <div>
              <Label>Banco</Label>
              <Input {...register('banco')} placeholder="Ej: N26, Santander..." />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" className="flex-1" onClick={() => setShowNewAccount(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={createAccount.isPending}>
                Crear
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
