/**
 * Resources
 */
import { useMutation } from '@tanstack/react-query'
import i18next from 'i18next'
import { z } from 'zod'

/**
 * Dependencies
 */
import apiClient from '@/lib/api/client'

// Translation
const tAuth = (key: string) => i18next.t(key, { ns: 'auth' })

/**
 * Schemas & DTOs
 */
export const useRequestPasswordResetSchema = () => {
  const payload = z.object({
    email: z
      .string()
      .min(1, { message: tAuth('fields.tk_emailRequired_') })
      .email({ message: tAuth('fields.tk_emailError_') })
  })

  const response = z.object({
    message: z.string(),
    resetToken: z.string().optional()
  })

  return { payload, response }
}

export type RequestPasswordResetPayloadDto = z.infer<ReturnType<typeof useRequestPasswordResetSchema>['payload']>
export type RequestPasswordResetResponseDto = z.infer<ReturnType<typeof useRequestPasswordResetSchema>['response']>

/**
 * Hook declaration
 */
export const useRequestPasswordReset = () => {
  const schemas = useRequestPasswordResetSchema()

  const mutation = useMutation({
    mutationFn: async (data: RequestPasswordResetPayloadDto) => {
      // Schema validation
      schemas.payload.parse(data)

      // Send data to the API
      const response = await apiClient.post<RequestPasswordResetResponseDto>('/auth/request-password-reset', data)
      return schemas.response.parse(response)
    },
    onError: (error) => {
      console.error(tAuth('errors.tk_requestPasswordResetError_'), error)
    }
  })

  return {
    ...mutation,
    isLoading: mutation.isPending,
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync
  }
}
