export interface User {
  id: string
  email: string
  name: string
  role: string
  settings: string
  created_at: string
  updated_at: string
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface SignupData {
  name: string
  email: string
  password: string
}

export interface AuthCheckResponse {
  user: User
}
