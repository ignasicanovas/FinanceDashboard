import { apiClient } from './client'
import type { Tag } from '@/types'

export const tagsApi = {
  list: (accountId: number) =>
    apiClient.get<Tag[]>(`/api/accounts/${accountId}/tags`).then((r) => r.data),

  create: (accountId: number, data: { nombre: string; color: string }) =>
    apiClient.post<Tag>(`/api/accounts/${accountId}/tags`, data).then((r) => r.data),

  update: (accountId: number, nombre: string, color: string) =>
    apiClient.put<Tag>(`/api/accounts/${accountId}/tags/${encodeURIComponent(nombre)}`, { color }).then((r) => r.data),

  delete: (accountId: number, nombre: string) =>
    apiClient.delete(`/api/accounts/${accountId}/tags/${encodeURIComponent(nombre)}`),

  updateTransactionTags: (accountId: number, txnId: string, tags: string[]) =>
    apiClient
      .put<string[]>(`/api/accounts/${accountId}/transactions/${txnId}/tags`, { tags })
      .then((r) => r.data),
}
