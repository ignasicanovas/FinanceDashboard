import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kpisApi } from '@/api/kpis'

export const useKpis = (accountId: number) =>
  useQuery({ queryKey: ['kpis', accountId], queryFn: () => kpisApi.list(accountId), enabled: !!accountId })

export const useCreateKpi = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof kpisApi.create>[1]) => kpisApi.create(accountId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpis', accountId] }),
  })
}

export const useUpdateKpi = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kpiId, data }: { kpiId: number; data: Parameters<typeof kpisApi.update>[2] }) =>
      kpisApi.update(accountId, kpiId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpis', accountId] }),
  })
}

export const useDeleteKpi = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (kpiId: number) => kpisApi.delete(accountId, kpiId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpis', accountId] }),
  })
}

export const useReorderKpis = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: number[]) => kpisApi.reorder(accountId, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpis', accountId] }),
  })
}
