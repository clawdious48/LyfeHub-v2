const BASE_URL = '/api'

const AUTH_PAGES = ['/login', '/login.html']

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: Record<string, unknown> | object | FormData
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  const { body, ...rest } = options

  const config: RequestInit = {
    ...rest,
    credentials: 'include',
  }

  if (body instanceof FormData) {
    config.body = body
    config.headers = { ...options.headers } as HeadersInit
  } else {
    config.headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as HeadersInit
    if (body != null) {
      config.body = JSON.stringify(body)
    }
  }

  const response = await fetch(url, config)

  if (response.status === 401) {
    if (!AUTH_PAGES.some((p) => window.location.pathname.endsWith(p))) {
      window.location.href = '/login.html'
    }
    throw new ApiError('Unauthorized', 401)
  }

  const contentType = response.headers.get('content-type')
  let data: T

  if (contentType?.includes('application/json')) {
    data = (await response.json()) as T
  } else {
    data = (await response.text()) as unknown as T
  }

  if (!response.ok) {
    const msg =
      (data as Record<string, string>)?.error ??
      (data as Record<string, string>)?.message ??
      `HTTP ${response.status}`
    throw new ApiError(msg, response.status)
  }

  return data
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint),

  post: <T>(endpoint: string, body?: object) =>
    request<T>(endpoint, { method: 'POST', body }),

  patch: <T>(endpoint: string, body?: object) =>
    request<T>(endpoint, { method: 'PATCH', body }),

  put: <T>(endpoint: string, body?: object) =>
    request<T>(endpoint, { method: 'PUT', body }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  upload: <T>(endpoint: string, formData: FormData) =>
    request<T>(endpoint, { method: 'POST', body: formData }),
}
