import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../client.js'

export const orgMemberKeys = {
  all: ['org-members'] as const,
  list: (orgId: string) => [...orgMemberKeys.all, 'list', orgId] as const,
}

interface OrgMemberResponse {
  user_id: string
  email: string
  name: string
  role: string
}

export interface OrgMember {
  user_id: string
  name: string
  email: string
  role: string
}

export function useOrgMembers(orgId: string | undefined) {
  return useQuery({
    queryKey: orgMemberKeys.list(orgId ?? ''),
    queryFn: async (): Promise<OrgMember[]> => {
      if (!orgId) return []
      const members = await apiClient.get<OrgMemberResponse[]>(`/apex-orgs/${orgId}/members`)
      return members.map(m => ({
        user_id: m.user_id,
        name: m.name || m.email,
        email: m.email,
        role: m.role,
      }))
    },
    enabled: !!orgId,
  })
}
