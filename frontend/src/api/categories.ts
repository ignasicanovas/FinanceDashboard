import { apiClient } from './client'
import type { Category, Rule, Transaction } from '@/types'

export const categoriesApi = {
  list: (accountId: number) =>
    apiClient.get<Category[]>(`/api/accounts/${accountId}/categories`).then((r) => r.data),

  create: (accountId: number, data: Omit<Category, 'created_at'>) =>
    apiClient.post<Category>(`/api/accounts/${accountId}/categories`, data).then((r) => r.data),

  update: (accountId: number, nombre: string, data: Partial<Category>) =>
    apiClient.put<Category>(`/api/accounts/${accountId}/categories/${encodeURIComponent(nombre)}`, data).then((r) => r.data),

  delete: (accountId: number, nombre: string) =>
    apiClient.delete(`/api/accounts/${accountId}/categories/${encodeURIComponent(nombre)}`),
}

export const areasApi = {
  list: (accountId: number) =>
    apiClient.get<{ areas: string[] }>(`/api/accounts/${accountId}/areas`).then((r) => r.data.areas),

  create: (accountId: number, nombre: string) =>
    apiClient.post(`/api/accounts/${accountId}/areas`, { nombre }),

  delete: (accountId: number, nombre: string) =>
    apiClient.delete(`/api/accounts/${accountId}/areas/${encodeURIComponent(nombre)}`),
}

export const rulesApi = {
  list: (accountId: number) =>
    apiClient.get<Rule[]>(`/api/accounts/${accountId}/rules`).then((r) => r.data),

  create: (accountId: number, keyword: string, categoria: string) =>
    apiClient.post<Rule>(`/api/accounts/${accountId}/rules`, { keyword, categoria }).then((r) => r.data),

  delete: (accountId: number, ruleId: number) =>
    apiClient.delete(`/api/accounts/${accountId}/rules/${ruleId}`),

  test: (accountId: number, keyword: string) =>
    apiClient.post<{ matches: Transaction[]; count: number }>(`/api/accounts/${accountId}/rules/test`, { keyword }).then((r) => r.data),

  applyAll: (accountId: number) =>
    apiClient.post<{ updated: number }>(`/api/accounts/${accountId}/rules/apply-all`).then((r) => r.data),
}
