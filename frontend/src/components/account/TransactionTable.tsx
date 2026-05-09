import { useState } from 'react'
import { MoreHorizontal, ArrowLeft, ArrowRight, Banknote, RefreshCw, CalendarArrowUp, CalendarArrowDown, CalendarX } from 'lucide-react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CategorySelector from './CategorySelector'
import TagSelector from './TagSelector'
import CompensationDialog from './CompensationDialog'
import { useUpdateTransaction } from '@/hooks/useTransactions'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Transaction, TransactionFilters } from '@/types'

interface TransactionTableProps {
  accountId: number
  transactions: Transaction[]
  total: number
  filters: TransactionFilters
  onFiltersChange: (f: TransactionFilters) => void
}

export default function TransactionTable({
  accountId,
  transactions,
  total,
  filters,
  onFiltersChange,
}: TransactionTableProps) {
  const [compensationTxn, setCompensationTxn] = useState<Transaction | null>(null)
  const updateTxn = useUpdateTransaction(accountId)
  const page = filters.page ?? 1
  const perPage = filters.per_page ?? 50
  const pages = Math.ceil(total / perPage) || 1

  const handleCategoryChange = (txnId: string, categoria: string) => {
    updateTxn.mutate({ txnId, data: { categoria } })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-xs">
              <TableHead>Fecha</TableHead>
              <TableHead>Comercio / Concepto</TableHead>
              <TableHead className="text-right">Importe</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                  Sin transacciones para los filtros seleccionados
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((txn) => (
                <TableRow key={txn.id} className="text-sm hover:bg-gray-50/50">
                  <TableCell className="text-gray-500 whitespace-nowrap text-xs">
                    {formatDate(txn.fecha)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">
                          {txn.comercio || txn.concepto || '—'}
                        </p>
                        {txn.concepto && txn.comercio && (
                          <p className="text-xs text-gray-400 truncate max-w-[200px]">{txn.concepto}</p>
                        )}
                      </div>
                      {txn.compensacion_tipo === 'reembolso' && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 shrink-0">
                          <RefreshCw className="w-3 h-3" />
                          Reembolso
                        </Badge>
                      )}
                      {txn.compensacion_tipo === 'ahorro' && (txn.importe ?? 0) > 0 && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 shrink-0 text-green-600">
                          <Banknote className="w-3 h-3" />
                          Ing. ahorro
                        </Badge>
                      )}
                      {txn.desde_ahorro === 1 && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 shrink-0 text-blue-600">
                          <Banknote className="w-3 h-3" />
                          Ahorro
                        </Badge>
                      )}
                      {txn.diferir_mes === 1 && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 shrink-0 text-orange-600">
                          <CalendarArrowUp className="w-3 h-3" />
                          +1 mes
                        </Badge>
                      )}
                      {txn.diferir_mes === -1 && (
                        <Badge variant="secondary" className="text-xs flex items-center gap-1 shrink-0 text-purple-600">
                          <CalendarArrowDown className="w-3 h-3" />
                          -1 mes
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                    <span className={(txn.importe ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}>
                      {formatCurrency(txn.importe ?? 0)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <CategorySelector
                      accountId={accountId}
                      value={txn.categoria || ''}
                      onChange={(v) => handleCategoryChange(txn.id, v)}
                      disabled={txn.compensacion_tipo === 'reembolso' && (txn.importe ?? 0) > 0}
                    />
                  </TableCell>
                  <TableCell>
                    <TagSelector
                      accountId={accountId}
                      txnId={txn.id}
                      value={txn.tags || []}
                    />
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => updateTxn.mutate({ txnId: txn.id, data: { diferir_mes: txn.diferir_mes === 1 ? 0 : 1 } })}
                        >
                          <CalendarArrowUp className="w-4 h-4 mr-2" />
                          {txn.diferir_mes === 1 ? 'Quitar aplazamiento (mes siguiente)' : 'Mover al mes siguiente'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => updateTxn.mutate({ txnId: txn.id, data: { diferir_mes: txn.diferir_mes === -1 ? 0 : -1 } })}
                        >
                          <CalendarArrowDown className="w-4 h-4 mr-2" />
                          {txn.diferir_mes === -1 ? 'Quitar aplazamiento (mes anterior)' : 'Mover al mes anterior'}
                        </DropdownMenuItem>
                        {(txn.diferir_mes === 1 || txn.diferir_mes === -1) && (
                          <DropdownMenuItem
                            onClick={() => updateTxn.mutate({ txnId: txn.id, data: { diferir_mes: 0 } })}
                          >
                            <CalendarX className="w-4 h-4 mr-2" />
                            Devolver a fecha original
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setCompensationTxn(txn)}>
                          Gestionar compensación
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{total} transacciones · Página {page} de {pages}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onFiltersChange({ ...filters, page: page - 1 })}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pages}
              onClick={() => onFiltersChange({ ...filters, page: page + 1 })}
            >
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <CompensationDialog
        transaction={compensationTxn}
        accountId={accountId}
        onClose={() => setCompensationTxn(null)}
      />
    </div>
  )
}
