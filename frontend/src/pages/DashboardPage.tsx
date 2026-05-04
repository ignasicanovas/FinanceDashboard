import { useState } from 'react'
import { Plus } from 'lucide-react'
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
import type { Account } from '@/types'

export default function DashboardPage() {
  const { data: accounts = [], isLoading } = useAccounts()
  const [uploadTarget, setUploadTarget] = useState<Account | null>(null)
  const [showNewAccount, setShowNewAccount] = useState(false)
  const createAccount = useCreateAccount()
  const { register, handleSubmit, reset } = useForm<{ nombre: string; banco: string; emoji: string }>({
    defaultValues: { nombre: '', banco: '', emoji: '🏦' },
  })

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
    <AppShell title="Mis cuentas">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {accounts.length} {accounts.length === 1 ? 'cuenta' : 'cuentas'}
          </h2>
          <Button onClick={() => setShowNewAccount(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva cuenta
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-5xl mb-4">🏦</div>
            <p className="font-medium text-gray-700">No tienes cuentas todavía</p>
            <p className="text-sm mt-1">Crea tu primera cuenta para empezar</p>
            <Button className="mt-4" onClick={() => setShowNewAccount(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear primera cuenta
            </Button>
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
