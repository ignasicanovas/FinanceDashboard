import { PiggyBank } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'

export default function PresupuestoPage() {
  return (
    <AppShell title="Presupuesto">
      <div className="flex flex-col items-center justify-center h-full py-24 gap-4" style={{ color: 'var(--nf-ink-3)' }}>
        <PiggyBank className="w-12 h-12 opacity-30" />
        <p className="text-lg font-semibold" style={{ color: 'var(--nf-ink-2)' }}>Próximamente</p>
        <p className="text-sm">Define presupuestos por categoría y área</p>
      </div>
    </AppShell>
  )
}
