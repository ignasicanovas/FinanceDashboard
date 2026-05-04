import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi } from '@/api/accounts'
import type { Account } from '@/types'

export const useAccounts = () =>
  useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })

export const useAccount = (id: number) =>
  useQuery({ queryKey: ['account', id], queryFn: () => accountsApi.get(id), enabled: !!id })

export const useAccountStats = (id: number) =>
  useQuery({ queryKey: ['account', id, 'stats'], queryFn: () => accountsApi.stats(id), enabled: !!id })

export const useAccountMembers = (id: number) =>
  useQuery({ queryKey: ['account', id, 'members'], queryFn: () => accountsApi.members(id), enabled: !!id })

export const useCreateAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Parameters<typeof accountsApi.create>[0]) => accountsApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export const useUpdateAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Account> }) => accountsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      qc.invalidateQueries({ queryKey: ['account', id] })
    },
  })
}

export const useDeleteAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => accountsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })
}

export const useInviteMember = (accountId: number) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ email, access_level }: { email: string; access_level: string }) =>
      accountsApi.invite(accountId, email, access_level),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['account', accountId, 'members'] }),
  })
}
