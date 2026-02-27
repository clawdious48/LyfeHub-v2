import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'
import type { AuthCheckResponse, LoginCredentials } from '@/types/index.js'

export const authKeys = {
  check: ['auth', 'check'] as const,
}

export function useCheckAuth() {
  return useQuery({
    queryKey: authKeys.check,
    queryFn: () => apiClient.get<AuthCheckResponse>('/auth/check'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (credentials: LoginCredentials) =>
      apiClient.post<AuthCheckResponse>('/auth/login', credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: authKeys.check })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => apiClient.post<void>('/auth/logout'),
    onSuccess: () => {
      queryClient.clear()
    },
  })
}
