import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tagsApi } from '@/api/tags'

export const useTags = (accountId: number) =>
  useQuery({
    queryKey: ['tags', accountId],
    queryFn: () => tagsApi.list(accountId),
    enabled: !!accountId,
  })

export const useCreateTag = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { nombre: string; color: string }) => tagsApi.create(accountId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags', accountId] }),
  })
}

export const useUpdateTag = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, color }: { nombre: string; color: string }) =>
      tagsApi.update(accountId, nombre, color),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags', accountId] }),
  })
}

export const useDeleteTag = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => tagsApi.delete(accountId, nombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tags', accountId] })
      qc.invalidateQueries({ queryKey: ['transactions', accountId] })
    },
  })
}

export const useUpdateTransactionTags = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ txnId, tags }: { txnId: string; tags: string[] }) =>
      tagsApi.updateTransactionTags(accountId, txnId, tags),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', accountId] }),
  })
}
