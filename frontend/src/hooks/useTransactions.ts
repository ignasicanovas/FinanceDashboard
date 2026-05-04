import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionsApi } from '@/api/transactions'
import type { Transaction, TransactionFilters } from '@/types'

export const useTransactions = (accountId: number, filters: TransactionFilters = {}) =>
  useQuery({
    queryKey: ['transactions', accountId, filters],
    queryFn: () => transactionsApi.list(accountId, filters),
    enabled: !!accountId,
  })

export const usePaycheckDates = (accountId: number, keyword: string) =>
  useQuery({
    queryKey: ['paycheck-dates', accountId, keyword],
    queryFn: () => transactionsApi.paycheckDates(accountId, keyword),
    enabled: !!accountId && !!keyword,
  })

export const useUpdateTransaction = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ txnId, data }: { txnId: string; data: Partial<Transaction> }) =>
      transactionsApi.update(accountId, txnId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', accountId] })
      qc.invalidateQueries({ queryKey: ['account', accountId, 'stats'] })
    },
  })
}

export const useBulkCategorize = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, categoria }: { ids: string[]; categoria: string }) =>
      transactionsApi.bulkCategorize(accountId, ids, categoria),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', accountId] }),
  })
}

export const useUpload = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ file, bank }: { file: File; bank?: string }) =>
      transactionsApi.upload(accountId, file, bank),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions', accountId] })
      qc.invalidateQueries({ queryKey: ['account', accountId, 'stats'] })
    },
  })
}
