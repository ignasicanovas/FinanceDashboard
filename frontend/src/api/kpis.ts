import { apiClient } from './client'
import type { Kpi, FormulaItem } from '@/types'

type KpiPayload = {
  label: string
  emoji: string
  tipo: string
  orden: number
  areas: string[]
  compensacion_filtro?: string
  kpis_ref: number[]
  formula: FormulaItem[]
}

export const kpisApi = {
  list: (accountId: number) =>
    apiClient.get<Kpi[]>(`/api/accounts/${accountId}/kpis`).then((r) => r.data),

  create: (accountId: number, data: KpiPayload) =>
    apiClient.post<Kpi>(`/api/accounts/${accountId}/kpis`, data).then((r) => r.data),

  update: (accountId: number, kpiId: number, data: Partial<KpiPayload>) =>
    apiClient.put<Kpi>(`/api/accounts/${accountId}/kpis/${kpiId}`, data).then((r) => r.data),

  delete: (accountId: number, kpiId: number) =>
    apiClient.delete(`/api/accounts/${accountId}/kpis/${kpiId}`),

  reorder: (accountId: number, ids: number[]) =>
    apiClient.post(`/api/accounts/${accountId}/kpis/reorder`, { ids }),
}
