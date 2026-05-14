import { apiClient } from './client'
import type {
  MonthlySummaryItem,
  CategoryBreakdown,
  AreaBreakdown,
  MonthlyCategoryItem,
  MonthlyAreaItem,
  Transaction,
} from '@/types'

interface DateRange {
  fecha_desde?: string
  fecha_hasta?: string
  area?: string
  categoria?: string
  tag?: string
  desde_ahorro?: number
}

export interface TopComercioItem {
  nombre: string
  gasto: number
  num: number
}

export const statsApi = {
  kpiValues: (accountId: number, range: DateRange = {}) =>
    apiClient
      .get<{ values: Record<number, number> }>(`/api/accounts/${accountId}/stats/kpi-values`, { params: range })
      .then((r) => r.data.values),

  monthlySummary: (accountId: number, range: DateRange = {}) =>
    apiClient
      .get<{ data: MonthlySummaryItem[] }>(`/api/accounts/${accountId}/stats/monthly-summary`, { params: range })
      .then((r) => r.data.data),

  byCategory: (accountId: number, range: DateRange = {}) =>
    apiClient
      .get<{ data: CategoryBreakdown[] }>(`/api/accounts/${accountId}/stats/by-category`, { params: range })
      .then((r) => r.data.data),

  byArea: (accountId: number, range: DateRange = {}) =>
    apiClient
      .get<{ data: AreaBreakdown[] }>(`/api/accounts/${accountId}/stats/by-area`, { params: range })
      .then((r) => r.data.data),

  monthlyByCategory: (accountId: number, range: DateRange = {}) =>
    apiClient
      .get<{ data: MonthlyCategoryItem[] }>(`/api/accounts/${accountId}/stats/monthly-by-category`, { params: range })
      .then((r) => r.data.data),

  monthlyByArea: (accountId: number, range: DateRange = {}) =>
    apiClient
      .get<{ data: MonthlyAreaItem[] }>(`/api/accounts/${accountId}/stats/monthly-by-area`, { params: range })
      .then((r) => r.data.data),

  topComercios: (accountId: number, range: DateRange = {}, limit = 10) =>
    apiClient
      .get<{ data: TopComercioItem[] }>(`/api/accounts/${accountId}/stats/top-comercios`, {
        params: { ...range, limit },
      })
      .then((r) => r.data.data),

  kpiTransactions: (accountId: number, kpiId: number, range: DateRange = {}) =>
    apiClient
      .get<{ data: Transaction[] }>(`/api/accounts/${accountId}/kpis/${kpiId}/transactions`, { params: range })
      .then((r) => r.data.data),
}
