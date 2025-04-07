/**
 * Resources
 */
import { queryClient } from '@/lib/react-query/query-client'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactNode } from 'react'

/**
 * Dependencies
 */
import { useGuest } from '@/hooks/api/auth'

/**
 * TS Types
 */
interface QueryProviderProps {
  children: ReactNode
}

/**
 * Cached data
 */
const cachedMe = localStorage.getItem('authMe')
if (cachedMe) queryClient.setQueryData(['authMe'], JSON.parse(cachedMe))

/**
 * React declaration
 */
function InitGuest() {
  const guest = useGuest()
  guest.refetch()
  return <></>
}

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {!cachedMe && <InitGuest />}
      {children}
    </QueryClientProvider>
  )
}
