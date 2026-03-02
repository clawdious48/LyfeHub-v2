export interface User {
  id: string
  email: string
  name: string
  role: string
  avatar_url: string | null
  google_id: string | null
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface AuthCheckResponse {
  user: User
}
