/**
 * Resources
 */
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

/**
 * Dependencies
 */
import apiClient from '@/lib/api/client'

/**
 * Schemas & DTOs
 */
export const useGuestSchema = () => {
  const response = z.object({
    roles: z.array(z.string()),
    modules: z.array(z.string()),
    permissions: z.array(z.string())
  })

  return { response }
}

export type GuestResponseDto = z.infer<ReturnType<typeof useGuestSchema>['response']>

/**
 * Hook declaration
 */
export const useGuest = () => {
  const schemas = useGuestSchema()

  return useQuery({
    queryKey: ['guestAccess'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<GuestResponseDto>('/auth/guest')
        const data = schemas.response.parse(response)
        localStorage.setItem('guestAccess', JSON.stringify(data))
        return data
      } catch (error) {
        console.error('Failed to fetch guest access:', error)
        throw error
      }
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: false
  })
}
