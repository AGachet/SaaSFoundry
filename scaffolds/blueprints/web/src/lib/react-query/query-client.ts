/**
 * Resources
 */
import { QueryClient } from '@tanstack/react-query'

/**
 * Declarations
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    },
    mutations: {
      retry: 0
    }
  }
})
