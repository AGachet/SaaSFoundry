/**
 * Resources
 */
import { queryClient } from '@/lib/react-query/query-client'

/**
 * API Client using native Fetch API
 */
const apiClient = {
  /**
   * Generic method for making HTTP requests
   */
  async request<T>(endpoint: string, method: string = 'GET', data?: unknown, customHeaders: Record<string, string> = {}): Promise<T> {
    const baseApiUrl = '/api'
    const url = `${baseApiUrl}${endpoint}`

    // Default headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...customHeaders
    }

    // Request options
    const options: RequestInit = {
      method,
      headers,
      // Important: include cookies in each request
      credentials: 'include'
    }

    // Add request body for non-GET methods
    if (data && method !== 'GET') options.body = JSON.stringify(data)

    try {
      const response = await fetch(url, options)

      // HTTP error handling
      if (!response.ok) {
        // Specific handling for 401 errors (unauthorized)
        if (response.status === 401) {
          // Invalidate authentication status
          queryClient.setQueryData(['authMe'], null)
          localStorage.removeItem('authMe')
        }

        // Get error message from API if available
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP Error ${response.status}`)
      }

      // Check if response is empty
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) return (await response.json()) as T

      return {} as T
    } catch (error) {
      console.error('API Error:', error)
      throw error
    }
  },

  /**
   * Specific HTTP methods
   */
  get<T>(endpoint: string, customHeaders = {}): Promise<T> {
    return this.request<T>(endpoint, 'GET', undefined, customHeaders)
  },

  post<T>(endpoint: string, data: unknown, customHeaders = {}): Promise<T> {
    return this.request<T>(endpoint, 'POST', data, customHeaders)
  },

  put<T>(endpoint: string, data: unknown, customHeaders = {}): Promise<T> {
    return this.request<T>(endpoint, 'PUT', data, customHeaders)
  },

  patch<T>(endpoint: string, data: unknown, customHeaders = {}): Promise<T> {
    return this.request<T>(endpoint, 'PATCH', data, customHeaders)
  },

  delete<T>(endpoint: string, customHeaders = {}): Promise<T> {
    return this.request<T>(endpoint, 'DELETE', undefined, customHeaders)
  }
}

export default apiClient
