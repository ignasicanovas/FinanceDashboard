import { create } from 'zustand'
import type { Account } from '@/types'

interface AccountState {
  activeAccountId: number | null
  accounts: Account[]
  setActiveAccount: (id: number) => void
  setAccounts: (accounts: Account[]) => void
}

export const useAccountStore = create<AccountState>((set) => ({
  activeAccountId: null,
  accounts: [],
  setActiveAccount: (id) => set({ activeAccountId: id }),
  setAccounts: (accounts) => set({ accounts }),
}))
