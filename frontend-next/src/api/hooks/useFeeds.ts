import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '../client.js'

// ── Types ───────────────────────────────────────────────────────────

export interface Feed {
  id: string
  url: string
  feed_url: string
  title: string
  icon_url: string
  created_at: string
}

export interface FeedItem {
  id: string
  feed_id: string
  title: string
  url: string
  published_at: string | null
  fetched_at: string
  feed_title: string
  feed_icon_url: string
}

// ── Query Keys ──────────────────────────────────────────────────────

export const feedKeys = {
  all: ['feeds'] as const,
  list: () => [...feedKeys.all, 'list'] as const,
  items: (feedIds: string[], limit: number) =>
    [...feedKeys.all, 'items', ...feedIds, limit] as const,
}

// ── Hooks ───────────────────────────────────────────────────────────

export function useFeeds() {
  return useQuery({
    queryKey: feedKeys.list(),
    queryFn: () => apiClient.get<Feed[]>('/feeds'),
  })
}

export function useAddFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { url: string }) =>
      apiClient.post<Feed>('/feeds', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.list() })
    },
  })
}

export function useDeleteFeed() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<void>(`/feeds/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: feedKeys.list() })
    },
  })
}

export function useFeedItems(feedIds: string[], limit: number = 20) {
  return useQuery({
    queryKey: feedKeys.items(feedIds, limit),
    queryFn: () =>
      apiClient.get<FeedItem[]>(
        `/feeds/items?feed_ids=${feedIds.join(',')}&limit=${limit}`
      ),
    enabled: feedIds.length > 0,
  })
}
