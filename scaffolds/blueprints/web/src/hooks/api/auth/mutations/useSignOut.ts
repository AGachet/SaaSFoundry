/**
 * Resources
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import i18next from 'i18next'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

/**
 * Dependencies
 */
import { useGuest } from '@/hooks/api/auth'
import apiClient from '@/lib/api/client'

// Translation
const tAuth = (key: string) => i18next.t(key, { ns: 'auth' })

/**
 * Types
 */
import type { MeResponseDto } from '@/hooks/api/auth/queries/useMe'

/**
 * Schemas & DTOs
 */
export const useSignOutSchema = () => {
  const payload = z.object({
    userId: z.string()
  })

  const response = z.object({
    message: z.string()
  })
  return { payload, response }
}

export type SignOutPayloadDto = z.infer<ReturnType<typeof useSignOutSchema>['payload']>
export type SignOutResponseDto = z.infer<ReturnType<typeof useSignOutSchema>['response']>

/**
 * Hook declaration
 */
export const useSignOut = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const guest = useGuest()
  const schemas = useSignOutSchema()

  // Get user data from cache
  const me = queryClient.getQueryData<MeResponseDto>(['authMe'])
  if (!me?.userId) throw new Error('User not found in cache')

  const mutation = useMutation({
    mutationFn: async () => {
      // Schema validation
      const payload: SignOutPayloadDto = {
        userId: me.userId
      }
      schemas.payload.parse(payload)

      // Send data to the API
      const response = await apiClient.post<SignOutResponseDto>('/auth/signout', payload)
      return schemas.response.parse(response)
    },
    onSuccess: async () => {
      // Fetch guest access
      await guest.refetch()

      // Invalidate and reset auth status
      queryClient.setQueryData(['authMe'], null)
      localStorage.removeItem('authMe')

      // Redirect to signin page
      navigate('/signin')
    },
    onError: (error) => {
      console.error(tAuth('errors.tk_signoutError_'), error)
    }
  })

  return {
    ...mutation,
    isLoading: mutation.isPending,
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync
  }
}
