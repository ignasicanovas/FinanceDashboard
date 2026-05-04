import { apiClient } from './client'
import type { Transaction, TransactionListResponse, TransactionFilters, UploadResult } from '@/types'

export const transactionsApi = {
  list: (accountId: number, filters: TransactionFilters = {}) =>
    apiClient
      .get<TransactionListResponse>(`/api/accounts/${accountId}/transactions`, { params: filters })
      .then((r) => r.data),

  update: (accountId: number, txnId: string, data: Partial<Transaction>) =>
    apiClient.put<Transaction>(`/api/accounts/${accountId}/transactions/${txnId}`, data).then((r) => r.data),

  bulkCategorize: (accountId: number, ids: string[], categoria: string) =>
    apiClient.put(`/api/accounts/${accountId}/transactions/bulk-categorize`, { ids, categoria }),

  paycheckDates: (accountId: number, keyword: string) =>
    apiClient
      .get<{ dates: string[] }>(`/api/accounts/${accountId}/transactions/paycheck-dates`, { params: { keyword } })
      .then((r) => r.data.dates),

  expensesForCompensation: (accountId: number, search?: string) =>
    apiClient
      .get<{ items: Transaction[] }>(`/api/accounts/${accountId}/transactions/expenses-for-compensation`, {
        params: { search },
      })
      .then((r) => r.data.items),

  incomesForCompensation: (accountId: number, search?: string) =>
    apiClient
      .get<{ items: Transaction[] }>(`/api/accounts/${accountId}/transactions/incomes-for-compensation`, {
        params: search ? { search } : {},
      })
      .then((r) => r.data.items),

  upload: (accountId: number, file: File, bank?: string) => {
    const form = new FormData()
    form.append('file', file)
    if (bank) form.append('bank', bank)
    return apiClient
      .post<UploadResult>(`/api/accounts/${accountId}/upload`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },
}
