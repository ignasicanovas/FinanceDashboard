import { useState } from 'react'
import { Plus, Trash2, FlaskConical, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { useRules, useCreateRule, useDeleteRule, useApplyAllRules } from '@/hooks/useCategories'
import CategorySelector from '@/components/account/CategorySelector'
import { rulesApi } from '@/api/categories'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types'

interface RulesPanelProps {
  accountId: number
}

export default function RulesPanel({ accountId }: RulesPanelProps) {
  const { data: rules = [] } = useRules(accountId)
  const [keyword, setKeyword] = useState('')
  const [categoria, setCategoria] = useState('')
  const [testKw, setTestKw] = useState('')
  const [testMatches, setTestMatches] = useState<Transaction[] | null>(null)
  const [showTest, setShowTest] = useState(false)

  const createRule = useCreateRule(accountId)
  const deleteRule = useDeleteRule(accountId)
  const applyAll = useApplyAllRules(accountId)

  const handleCreate = async () => {
    if (!keyword.trim() || !categoria) return
    try {
      await createRule.mutateAsync({ keyword: keyword.trim(), categoria })
      setKeyword('')
      setCategoria('')
      toast.success('Regla creada y aplicada a transacciones existentes')
    } catch {
      toast.error('Error al crear la regla')
    }
  }

  const handleTest = async () => {
    if (!testKw.trim()) return
    const result = await rulesApi.test(accountId, testKw)
    setTestMatches(result.matches)
  }

  const handleApplyAll = async () => {
    try {
      const result = await applyAll.mutateAsync()
      toast.success(`${result.updated} transacciones categorizadas automáticamente`)
    } catch {
      toast.error('Error al aplicar las reglas')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Las reglas categorizan automáticamente las transacciones por el nombre del comercio.
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowTest(true)}>
            <FlaskConical className="w-4 h-4 mr-1" />
            Probar
          </Button>
          <Button size="sm" onClick={handleApplyAll} disabled={applyAll.isPending}>
            <Zap className="w-4 h-4 mr-1" />
            Aplicar todas
          </Button>
        </div>
      </div>

      {/* New rule form */}
      <div className="p-4 bg-gray-50 rounded-xl space-y-3">
        <Label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nueva regla</Label>
        <div className="flex gap-2 flex-col sm:flex-row">
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Palabra clave en el comercio (ej: mercadona)"
            className="flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <CategorySelector
            accountId={accountId}
            value={categoria}
            onChange={setCategoria}
            placeholder="Categoría"
          />
          <Button onClick={handleCreate} disabled={!keyword || !categoria || createRule.isPending}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Rules list */}
      <div className="space-y-1.5">
        {rules.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin reglas configuradas</p>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className="flex items-center gap-3 px-3 py-2 bg-white rounded-lg border hover:shadow-sm group">
              <code className="text-sm bg-gray-100 px-2 py-0.5 rounded text-gray-700 flex-1 truncate">
                {rule.keyword}
              </code>
              <span className="text-gray-400 text-xs">→</span>
              <Badge variant="secondary" className="flex-shrink-0">{rule.categoria}</Badge>
              <button
                onClick={() => deleteRule.mutate(rule.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Test dialog */}
      <Dialog open={showTest} onOpenChange={setShowTest}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Probar palabra clave</DialogTitle>
            <DialogDescription>Busca qué transacciones coincidirían con una palabra clave</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={testKw}
                onChange={(e) => setTestKw(e.target.value)}
                placeholder="Palabra clave..."
                onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              />
              <Button onClick={handleTest}>Buscar</Button>
            </div>
            {testMatches !== null && (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {testMatches.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Sin coincidencias</p>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-2">{testMatches.length} coincidencias encontradas</p>
                    {testMatches.map((t) => (
                      <div key={t.id} className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded">
                        <span className="text-gray-500 text-xs">{formatDate(t.fecha)}</span>
                        <span className="flex-1 truncate">{t.comercio}</span>
                        <span className={`font-medium ${(t.importe ?? 0) < 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {formatCurrency(t.importe ?? 0)}
                        </span>
                        {t.categoria && <Badge variant="secondary" className="text-xs">{t.categoria}</Badge>}
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
