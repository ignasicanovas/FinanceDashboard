import { apiClient } from './client'
import type { TokenResponse, User } from '@/types'

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<TokenResponse>('/api/auth/login', { email, password }).then((r) => r.data),

  register: (email: string, password: string, full_name?: string) =>
    apiClient.post<TokenResponse>('/api/auth/register', { email, password, full_name }).then((r) => r.data),

  me: () => apiClient.get<User>('/api/auth/me').then((r) => r.data),
}
