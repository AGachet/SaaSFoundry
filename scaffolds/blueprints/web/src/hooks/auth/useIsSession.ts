/**
 * Resources
 */
import { useQuery } from '@tanstack/react-query'

/**
 * Schemas & DTOs
 */
import type { MeResponseDto } from '@/hooks/api/auth'

/**
 * Hook declaration
 */
export const useIsSessionActive = () => {
  const { data: me } = useQuery<MeResponseDto>({
    queryKey: ['authMe'],
    enabled: false
  })

  return {
    isSessionActive: !!me?.userId
  }
}
