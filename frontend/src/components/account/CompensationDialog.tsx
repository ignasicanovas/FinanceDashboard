import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Search } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateTransaction } from '@/hooks/useTransactions'
import { transactionsApi } from '@/api/transactions'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction } from '@/types'

interface CompensationDialogProps {
  transaction: Transaction | null
  accountId: number
  onClose: () => void
}

export default function CompensationDialog({ transaction, accountId, onClose }: CompensationDialogProps) {
  const [tipo, setTipo] = useState<string>('')
  const [linkedId, setLinkedId] = useState<string>('')
  const [expenses, setExpenses] = useState<Transaction[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [search, setSearch] = useState('')

  // Estado para la selección de ingresos (flujo ahorro en gastos)
  const [incomes, setIncomes] = useState<Transaction[]>([])
  const [loadingIncomes, setLoadingIncomes] = useState(false)
  const [incomeSearch, setIncomeSearch] = useState('')
  const [linkedIncomeId, setLinkedIncomeId] = useState<string>('')

  const updateTxn = useUpdateTransaction(accountId)

  const isExpense = (transaction?.importe ?? 0) < 0

  // Resetear estado al abrir para una transacción diferente
  useEffect(() => {
    if (!transaction) return
    setTipo(transaction.desde_ahorro === 1 ? 'ahorro' : (transaction.compensacion_tipo || ''))
    setLinkedId(transaction.compensacion_de || '')
    setLinkedIncomeId('')
    setSearch('')
    setIncomeSearch('')
  }, [transaction?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  const loadExpenses = async (q?: string) => {
    setLoadingExpenses(true)
    try {
      const data = await transactionsApi.expensesForCompensation(accountId, q)
      setExpenses(data)
    } catch {
      /* ignore */
    } finally {
      setLoadingExpenses(false)
    }
  }

  const loadIncomes = async (q?: string) => {
    setLoadingIncomes(true)
    try {
      const data = await transactionsApi.incomesForCompensation(accountId, q)
      setIncomes(data)
    } catch {
      /* ignore */
    } finally {
      setLoadingIncomes(false)
    }
  }

  // Cargar gastos al abrir (para flujo reembolso en ingresos)
  useEffect(() => {
    if (transaction) loadExpenses()
  }, [transaction?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // Cargar ingresos al abrir (para flujo ahorro en gastos)
  useEffect(() => {
    if (transaction && isExpense) loadIncomes()
  }, [transaction?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce búsqueda gastos
  useEffect(() => {
    const t = setTimeout(() => loadExpenses(search || undefined), 250)
    return () => clearTimeout(t)
  }, [search])  // eslint-disable-line react-hooks/exhaustive-deps

  // Debounce búsqueda ingresos
  useEffect(() => {
    if (!isExpense) return
    const t = setTimeout(() => loadIncomes(incomeSearch || undefined), 250)
    return () => clearTimeout(t)
  }, [incomeSearch])  // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-seleccionar el ingreso ya vinculado a este gasto
  useEffect(() => {
    if (incomes.length > 0 && transaction) {
      const already = incomes.find((i) => i.compensacion_de === transaction.id)
      if (already) setLinkedIncomeId(already.id)
    }
  }, [incomes])  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!transaction) return
    try {
      if (tipo === 'ahorro' && isExpense) {
        // 1. Marcar el gasto como desde_ahorro
        await updateTxn.mutateAsync({
          txnId: transaction.id,
          data: { desde_ahorro: 1, compensacion_tipo: undefined, compensacion_de: undefined },
        })
        // 2. Vincular el ingreso de ahorro seleccionado
        if (linkedIncomeId) {
          await updateTxn.mutateAsync({
            txnId: linkedIncomeId,
            data: { compensacion_de: transaction.id, compensacion_tipo: 'ahorro' },
          })
        }
      } else {
        // Flujo existente: reembolso (ingreso que compensa un gasto)
        await updateTxn.mutateAsync({
          txnId: transaction.id,
          data: {
            compensacion_tipo: tipo || undefined,
            compensacion_de: linkedId || undefined,
            desde_ahorro: tipo === 'ahorro' ? 1 : 0,
          },
        })
      }
      toast.success('Compensación guardada')
      onClose()
    } catch {
      toast.error('Error al guardar')
    }
  }

  const handleRemove = async () => {
    if (!transaction) return
    try {
      await updateTxn.mutateAsync({
        txnId: transaction.id,
        data: { compensacion_tipo: undefined, compensacion_de: undefined, desde_ahorro: 0 },
      })
      // Si había un ingreso de ahorro vinculado, desvincularlo también
      if (linkedIncomeId) {
        await updateTxn.mutateAsync({
          txnId: linkedIncomeId,
          data: { compensacion_tipo: undefined, compensacion_de: undefined },
        })
      }
      toast.success('Compensación eliminada')
      onClose()
    } catch {
      toast.error('Error al eliminar')
    }
  }

  if (!transaction) return null

  const linkedExpense = expenses.find((e) => e.id === linkedId)
  const linkedIncome = incomes.find((i) => i.id === linkedIncomeId)

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Gestionar compensación</DialogTitle>
          <DialogDescription>
            {transaction.comercio} — {formatCurrency(transaction.importe ?? 0)} el {formatDate(transaction.fecha)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Tipo de compensación</Label>
            <Select value={tipo || '__none__'} onValueChange={(v) => setTipo(v === '__none__' ? '' : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sin compensación" />
              </SelectTrigger>
              <SelectContent disablePortal>
                <SelectItem value="__none__">Sin compensación</SelectItem>
                {!isExpense && (
                  <SelectItem value="reembolso">
                    💸 Reembolso — este ingreso compensa un gasto
                  </SelectItem>
                )}
                {isExpense && (
                  <SelectItem value="ahorro">
                    🏦 De ahorro — pagado desde cuenta de ahorro
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Flujo reembolso: ingreso que compensa un gasto */}
          {tipo === 'reembolso' && (
            <div className="space-y-2">
              <Label>Gasto que se compensa</Label>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por comercio o concepto..."
                  className="pl-8 text-sm h-9"
                />
              </div>

              {linkedId && linkedExpense && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm">
                  <span className="font-medium text-blue-800">Seleccionado:</span>
                  <span className="text-blue-700">{linkedExpense.comercio || linkedExpense.concepto}</span>
                  <span className="text-red-600 ml-auto font-medium">{formatCurrency(linkedExpense.importe ?? 0)}</span>
                  <button onClick={() => setLinkedId('')} className="text-blue-400 hover:text-blue-600 text-xs ml-1">✕</button>
                </div>
              )}

              <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
                {loadingExpenses ? (
                  <p className="px-3 py-3 text-sm text-gray-400 text-center">Cargando...</p>
                ) : expenses.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-gray-400 text-center">
                    {search ? 'Sin resultados para esa búsqueda' : 'Sin gastos disponibles'}
                  </p>
                ) : (
                  expenses.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => setLinkedId(e.id === linkedId ? '' : e.id)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 flex items-center gap-2 ${
                        linkedId === e.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <span className={`flex-1 font-medium truncate ${linkedId === e.id ? 'text-blue-700' : 'text-gray-800'}`}>
                        {e.comercio || e.concepto || '—'}
                      </span>
                      <span className="text-red-500 tabular-nums shrink-0">{formatCurrency(e.importe ?? 0)}</span>
                      <span className="text-gray-400 text-xs shrink-0">{formatDate(e.fecha)}</span>
                      {linkedId === e.id && <span className="text-blue-600 text-xs font-bold shrink-0">✓</span>}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Flujo ahorro: gasto que se pagó desde cuenta de ahorro → vincular ingreso */}
          {tipo === 'ahorro' && isExpense && (
            <div className="space-y-2">
              <Label>Ingreso de la cuenta de ahorro (opcional)</Label>

              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <Input
                  value={incomeSearch}
                  onChange={(e) => setIncomeSearch(e.target.value)}
                  placeholder="Buscar por comercio o concepto..."
                  className="pl-8 text-sm h-9"
                />
              </div>

              {linkedIncomeId && linkedIncome && (
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-sm">
                  <span className="font-medium text-green-800">Seleccionado:</span>
                  <span className="text-green-700">{linkedIncome.comercio || linkedIncome.concepto}</span>
                  <span className="text-green-600 ml-auto font-medium">{formatCurrency(linkedIncome.importe ?? 0)}</span>
                  <button onClick={() => setLinkedIncomeId('')} className="text-green-400 hover:text-green-600 text-xs ml-1">✕</button>
                </div>
              )}

              <div className="max-h-52 overflow-y-auto rounded-md border divide-y">
                {loadingIncomes ? (
                  <p className="px-3 py-3 text-sm text-gray-400 text-center">Cargando...</p>
                ) : incomes.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-gray-400 text-center">
                    {incomeSearch ? 'Sin resultados para esa búsqueda' : 'Sin ingresos disponibles'}
                  </p>
                ) : (
                  incomes.map((inc) => (
                    <button
                      key={inc.id}
                      type="button"
                      onClick={() => setLinkedIncomeId(inc.id === linkedIncomeId ? '' : inc.id)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50 flex items-center gap-2 ${
                        linkedIncomeId === inc.id ? 'bg-green-50' : ''
                      }`}
                    >
                      <span className={`flex-1 font-medium truncate ${linkedIncomeId === inc.id ? 'text-green-700' : 'text-gray-800'}`}>
                        {inc.comercio || inc.concepto || '—'}
                      </span>
                      <span className="text-green-500 tabular-nums shrink-0">{formatCurrency(inc.importe ?? 0)}</span>
                      <span className="text-gray-400 text-xs shrink-0">{formatDate(inc.fecha)}</span>
                      {linkedIncomeId === inc.id && <span className="text-green-600 text-xs font-bold shrink-0">✓</span>}
                    </button>
                  ))
                )}
              </div>

              <p className="text-xs text-gray-400">
                Si vinculas el ingreso de ahorro, se marcará como no categorizable automáticamente.
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {(transaction.compensacion_tipo || transaction.desde_ahorro) && (
              <Button variant="destructive" size="sm" onClick={handleRemove}>
                Eliminar
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateTxn.isPending}>
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
