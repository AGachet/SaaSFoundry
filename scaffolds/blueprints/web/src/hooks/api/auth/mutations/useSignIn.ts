/**
 * Resources
 */
import { useMutation } from '@tanstack/react-query'
import i18next from 'i18next'
import { z } from 'zod'

/**
 * Dependencies
 */
import { useMe } from '@/hooks/api/auth'
import apiClient from '@/lib/api/client'

// Translation
const tAuth = (key: string) => i18next.t(key, { ns: 'auth' })

/**
 * Schemas & DTOs
 */
export const useSignInSchema = () => {
  const payload = z.object({
    email: z
      .string()
      .min(1, { message: tAuth('fields.tk_emailRequired_') })
      .email({ message: tAuth('fields.tk_emailError_') }),
    password: z.string().min(1, { message: tAuth('fields.tk_passwordRequired_') }),
    confirmAccountToken: z.string().optional(),
    locale: z
      .string()
      .optional()
      .transform((val) => val?.toUpperCase())
  })

  const response = z.object({
    userId: z.string()
  })

  return { payload, response }
}

export type SignInPayloadDto = z.infer<ReturnType<typeof useSignInSchema>['payload']>
export type SignInResponseDto = z.infer<ReturnType<typeof useSignInSchema>['response']>

/**
 * Hook declaration
 */
export const useSignIn = () => {
  const me = useMe()
  const schemas = useSignInSchema()

  const mutation = useMutation({
    mutationFn: async (data: SignInPayloadDto) => {
      // Schema validation
      schemas.payload.parse(data)

      // Send data to the API
      const response = await apiClient.post<SignInResponseDto>('/auth/signin', data)
      return schemas.response.parse(response)
    },
    onSuccess: async () => {
      // Remove guest access
      localStorage.removeItem('guestAccess')

      // Fetch user profile
      await me.refetch()
    },
    onError: (error) => {
      console.error(tAuth('errors.tk_signinError_'), error)
    }
  })

  return {
    ...mutation,
    isLoading: mutation.isPending,
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync
  }
}
