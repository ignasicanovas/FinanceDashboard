import { apiClient } from './client'
import type { Kpi } from '@/types'

export const kpisApi = {
  list: (accountId: number) =>
    apiClient.get<Kpi[]>(`/api/accounts/${accountId}/kpis`).then((r) => r.data),

  create: (accountId: number, data: Omit<Kpi, 'id' | 'areas' | 'areas_list' | 'kpis_ref' | 'kpis_ref_list'> & { areas: string[]; kpis_ref: number[] }) =>
    apiClient.post<Kpi>(`/api/accounts/${accountId}/kpis`, data).then((r) => r.data),

  update: (accountId: number, kpiId: number, data: Partial<Omit<Kpi, 'areas' | 'kpis_ref' | 'kpis_ref_list'> & { areas: string[]; kpis_ref: number[] }>) =>
    apiClient.put<Kpi>(`/api/accounts/${accountId}/kpis/${kpiId}`, data).then((r) => r.data),

  delete: (accountId: number, kpiId: number) =>
    apiClient.delete(`/api/accounts/${accountId}/kpis/${kpiId}`),

  reorder: (accountId: number, ids: number[]) =>
    apiClient.post(`/api/accounts/${accountId}/kpis/reorder`, { ids }),
}
