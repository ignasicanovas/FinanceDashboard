import { apiClient } from './client'
import type { Account, AccountStats, Member } from '@/types'

export const accountsApi = {
  list: () => apiClient.get<Account[]>('/api/accounts').then((r) => r.data),

  get: (id: number) => apiClient.get<Account>(`/api/accounts/${id}`).then((r) => r.data),

  create: (data: { nombre: string; banco?: string; emoji?: string; color?: string; descripcion?: string }) =>
    apiClient.post<Account>('/api/accounts', data).then((r) => r.data),

  update: (id: number, data: Partial<Account>) =>
    apiClient.put<Account>(`/api/accounts/${id}`, data).then((r) => r.data),

  delete: (id: number) => apiClient.delete(`/api/accounts/${id}`),

  stats: (id: number) => apiClient.get<AccountStats>(`/api/accounts/${id}/stats`).then((r) => r.data),

  members: (id: number) => apiClient.get<Member[]>(`/api/accounts/${id}/members`).then((r) => r.data),

  invite: (id: number, email: string, access_level: string) =>
    apiClient.post(`/api/accounts/${id}/invite`, { email, access_level }),

  removeMember: (accountId: number, userId: number) =>
    apiClient.delete(`/api/accounts/${accountId}/members/${userId}`),
}
