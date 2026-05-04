import { Input } from '@/components/ui/input'
import FilterSidebar from './FilterSidebar'
import TransactionTable from './TransactionTable'
import { useTransactions } from '@/hooks/useTransactions'
import type { TransactionFilters } from '@/types'

interface TransactionsViewProps {
  accountId: number
  filters: TransactionFilters
  onFiltersChange: (f: TransactionFilters) => void
}

export default function TransactionsView({ accountId, filters, onFiltersChange }: TransactionsViewProps) {
  const { data, isLoading } = useTransactions(accountId, filters)

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <FilterSidebar accountId={accountId} filters={filters} onChange={onFiltersChange} />

      <div className="flex-1 min-w-0 space-y-3">
        <Input
          type="search"
          placeholder="Buscar por comercio o concepto..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined, page: 1 })}
          className="max-w-sm"
        />

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <TransactionTable
            accountId={accountId}
            transactions={data?.items ?? []}
            total={data?.total ?? 0}
            filters={filters}
            onFiltersChange={onFiltersChange}
          />
        )}
      </div>
    </div>
  )
}
