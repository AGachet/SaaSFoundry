/**
 * Resources
 */
import { useQueryClient } from '@tanstack/react-query'

/**
 * Schemas & DTOs
 */
import type { MeResponseDto } from '@/hooks/api/auth'

/**
 * Hook declaration
 */
export const useIsSessionActive = () => {
  const queryClient = useQueryClient()
  const me = queryClient.getQueryData<MeResponseDto>(['authMe'])

  return {
    isSessionActive: !!me?.userId
  }
}
