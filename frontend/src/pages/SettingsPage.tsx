import { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Tag, BarChart2, Zap, Hash, Trash2 } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import CategoriesPanel from '@/components/settings/CategoriesPanel'
import KpiPanel from '@/components/settings/KpiPanel'
import RulesPanel from '@/components/settings/RulesPanel'
import TagsPanel from '@/components/settings/TagsPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAccounts, useAccount, useDeleteAccount } from '@/hooks/useAccounts'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

export default function SettingsPage() {
  const { data: accounts = [] } = useAccounts()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const tab = searchParams.get('tab') || 'categories'
  const accountId = Number(searchParams.get('account') || accounts[0]?.id || 0)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: account } = useAccount(accountId)
  const deleteAccount = useDeleteAccount()

  const setTab = (t: string) => setSearchParams((p) => { p.set('tab', t); return p })
  const setAccount = (id: string) => setSearchParams((p) => { p.set('account', id); return p })

  const handleDelete = () => {
    deleteAccount.mutate(accountId, {
      onSuccess: () => {
        setShowDeleteDialog(false)
        navigate('/dashboard')
      },
    })
  }

  return (
    <AppShell title="Configuración">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Account selector */}
        {accounts.length > 1 && (
          <div className="flex items-center gap-3">
            <Label className="text-sm text-gray-600 shrink-0">Cuenta:</Label>
            <Select value={String(accountId)} onValueChange={setAccount}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.emoji} {a.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {accountId ? (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="categories" className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categorías y Áreas
              </TabsTrigger>
              <TabsTrigger value="kpis" className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4" />
                Indicadores KPI
              </TabsTrigger>
              <TabsTrigger value="rules" className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Reglas automáticas
              </TabsTrigger>
              <TabsTrigger value="tags" className="flex items-center gap-2">
                <Hash className="w-4 h-4" />
                Tags
              </TabsTrigger>
            </TabsList>

            <div className="mt-6 bg-white rounded-xl border p-6">
              <TabsContent value="categories">
                <CategoriesPanel accountId={accountId} />
              </TabsContent>
              <TabsContent value="kpis">
                <KpiPanel accountId={accountId} />
              </TabsContent>
              <TabsContent value="rules">
                <RulesPanel accountId={accountId} />
              </TabsContent>
              <TabsContent value="tags">
                <TagsPanel accountId={accountId} />
              </TabsContent>
            </div>
          </Tabs>
        ) : (
          <div className="text-center py-16 text-gray-500">
            <p>Selecciona una cuenta para configurar</p>
          </div>
        )}

        {/* Danger zone — only for account owners */}
        {account?.is_owner === 1 && (
          <div className="bg-white rounded-xl border border-red-200 p-6">
            <h3 className="text-sm font-semibold text-red-700 mb-1">Zona de peligro</h3>
            <p className="text-sm text-gray-500 mb-4">
              Eliminar la cuenta borrará permanentemente todos sus datos, transacciones y configuración.
            </p>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar cuenta
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar "{account?.emoji} {account?.nombre}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Esta acción es irreversible. Se eliminarán todos los datos, transacciones, categorías y configuración de esta cuenta.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteAccount.isPending}>
              {deleteAccount.isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
