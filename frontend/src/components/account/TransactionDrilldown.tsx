import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { statsApi } from '@/api/stats'
import { transactionsApi } from '@/api/transactions'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction, TransactionFilters } from '@/types'

export interface DrilldownTarget {
  title: string
  accountId: number
  filters: TransactionFilters
  kpiId?: number
}

interface Props {
  target: DrilldownTarget | null
  onClose: () => void
}

export default function TransactionDrilldown({ target, onClose }: Props) {
  const [rows, setRows] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!target) return
    setRows([])
    setLoading(true)
    const { accountId, filters, kpiId } = target
    const promise = kpiId !== undefined
      ? statsApi.kpiTransactions(accountId, kpiId, {
          fecha_desde: filters.fecha_desde,
          fecha_hasta: filters.fecha_hasta,
          area: filters.area,
          categoria: filters.categoria,
          tag: filters.tag,
        })
      : transactionsApi.list(accountId, { ...filters, per_page: 200 }).then((r) => r.items)

    promise
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [target?.title, target?.accountId, target?.kpiId, target?.filters.fecha_desde, target?.filters.fecha_hasta, target?.filters.categoria, target?.filters.area])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Dialog open={!!target} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{target?.title ?? ''}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Sin transacciones</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="pb-2 pr-3 font-medium">Concepto</th>
                  <th className="pb-2 pr-3 font-medium">Categoría</th>
                  <th className="pb-2 pr-3 font-medium">Fecha</th>
                  <th className="pb-2 text-right font-medium">Importe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-3 font-medium text-gray-800 truncate max-w-[220px]">
                      {txn.comercio || txn.concepto || '—'}
                    </td>
                    <td className="py-2 pr-3">
                      {txn.categoria ? (
                        <span className="inline-flex items-center gap-1.5">
                          {txn.categoria_emoji && <span>{txn.categoria_emoji}</span>}
                          {txn.categoria_color && (
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: txn.categoria_color }} />
                          )}
                          <span className="text-gray-700">{txn.categoria}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{formatDate(txn.fecha)}</td>
                    <td className={`py-2 text-right tabular-nums font-medium whitespace-nowrap ${(txn.importe ?? 0) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {formatCurrency(txn.importe ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {rows.length > 0 && (
          <div className="pt-2 border-t text-xs text-gray-400">
            {rows.length} transacción{rows.length !== 1 ? 'es' : ''}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
