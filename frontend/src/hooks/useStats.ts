import { useQuery } from '@tanstack/react-query'
import { statsApi } from '@/api/stats'

export type { TopComercioItem } from '@/api/stats'

interface DateRange {
  fecha_desde?: string
  fecha_hasta?: string
  area?: string
  categoria?: string
  tag?: string
  desde_ahorro?: number
}

export const useKpiValues = (accountId: number, range: DateRange = {}) =>
  useQuery({
    queryKey: ['stats', accountId, 'kpi-values', range],
    queryFn: () => statsApi.kpiValues(accountId, range),
    enabled: !!accountId,
  })

export const useMonthlySummary = (accountId: number, range: DateRange = {}) =>
  useQuery({
    queryKey: ['stats', accountId, 'monthly-summary', range],
    queryFn: () => statsApi.monthlySummary(accountId, range),
    enabled: !!accountId,
  })

export const useByCategory = (accountId: number, range: DateRange = {}) =>
  useQuery({
    queryKey: ['stats', accountId, 'by-category', range],
    queryFn: () => statsApi.byCategory(accountId, range),
    enabled: !!accountId,
  })

export const useByArea = (accountId: number, range: DateRange = {}) =>
  useQuery({
    queryKey: ['stats', accountId, 'by-area', range],
    queryFn: () => statsApi.byArea(accountId, range),
    enabled: !!accountId,
  })

export const useMonthlyByCategory = (accountId: number, range: DateRange = {}) =>
  useQuery({
    queryKey: ['stats', accountId, 'monthly-by-category', range],
    queryFn: () => statsApi.monthlyByCategory(accountId, range),
    enabled: !!accountId,
  })

export const useMonthlyByArea = (accountId: number, range: DateRange = {}) =>
  useQuery({
    queryKey: ['stats', accountId, 'monthly-by-area', range],
    queryFn: () => statsApi.monthlyByArea(accountId, range),
    enabled: !!accountId,
  })

export const useTopComercios = (accountId: number, range: DateRange = {}, limit = 10) =>
  useQuery({
    queryKey: ['stats', accountId, 'top-comercios', range, limit],
    queryFn: () => statsApi.topComercios(accountId, range, limit),
    enabled: !!accountId,
  })
