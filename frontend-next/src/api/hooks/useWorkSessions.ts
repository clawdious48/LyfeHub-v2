import { useMutation } from '@tanstack/react-query'
import { apiClient } from '../client.js'

interface CreateWorkSessionData {
  name: string
  start: string
  end: string
  task_id?: string
}

export function useCreateWorkSession() {
  return useMutation({
    mutationFn: (data: CreateWorkSessionData) =>
      apiClient.post('/work-sessions', data),
  })
}
