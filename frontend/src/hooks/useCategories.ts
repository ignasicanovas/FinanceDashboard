import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi, areasApi, rulesApi } from '@/api/categories'
import type { Category } from '@/types'

export const useCategories = (accountId: number) =>
  useQuery({ queryKey: ['categories', accountId], queryFn: () => categoriesApi.list(accountId), enabled: !!accountId })

export const useAreas = (accountId: number) =>
  useQuery({ queryKey: ['areas', accountId], queryFn: () => areasApi.list(accountId), enabled: !!accountId })

export const useRules = (accountId: number) =>
  useQuery({ queryKey: ['rules', accountId], queryFn: () => rulesApi.list(accountId), enabled: !!accountId })

export const useCreateCategory = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Category, 'created_at'>) => categoriesApi.create(accountId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', accountId] }),
  })
}

export const useUpdateCategory = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, data }: { nombre: string; data: Partial<Category> }) =>
      categoriesApi.update(accountId, nombre, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', accountId] }),
  })
}

export const useDeleteCategory = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nombre, migrateTo }: { nombre: string; migrateTo?: string }) =>
      categoriesApi.delete(accountId, nombre, migrateTo),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories', accountId] }),
  })
}

export const useRenameArea = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ oldNombre, newNombre }: { oldNombre: string; newNombre: string }) =>
      areasApi.rename(accountId, oldNombre, newNombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['areas', accountId] })
      qc.invalidateQueries({ queryKey: ['categories', accountId] })
    },
  })
}

export const useCreateArea = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => areasApi.create(accountId, nombre),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['areas', accountId] }),
  })
}

export const useDeleteArea = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (nombre: string) => areasApi.delete(accountId, nombre),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['areas', accountId] })
      qc.invalidateQueries({ queryKey: ['categories', accountId] })
    },
  })
}

export const useCreateRule = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ keyword, categoria }: { keyword: string; categoria: string }) =>
      rulesApi.create(accountId, keyword, categoria),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rules', accountId] })
      qc.invalidateQueries({ queryKey: ['transactions', accountId] })
    },
  })
}

export const useDeleteRule = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ruleId: number) => rulesApi.delete(accountId, ruleId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rules', accountId] }),
  })
}

export const useApplyAllRules = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => rulesApi.applyAll(accountId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions', accountId] }),
  })
}
