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
export const useResetPasswordSchema = () => {
  const payload = z
    .object({
      resetPasswordToken: z.string(),
      password: z
        .string()
        .min(6, { message: tAuth('fields.tk_passwordMinLength_') })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, {
          message: tAuth('fields.tk_passwordComplexityError_')
        }),
      confirmPassword: z.string().min(6)
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: tAuth('fields.tk_passwordsDoNotMatchError_'),
      path: ['confirmPassword']
    })

  const response = z.object({
    message: z.string()
  })

  return { payload, response }
}

export type ResetPasswordPayloadDto = z.infer<ReturnType<typeof useResetPasswordSchema>['payload']>
export type ResetPasswordResponseDto = z.infer<ReturnType<typeof useResetPasswordSchema>['response']>

/**
 * Hook declaration
 */
export const useResetPassword = () => {
  const schemas = useResetPasswordSchema()

  const mutation = useMutation({
    mutationFn: async (data: ResetPasswordPayloadDto) => {
      // Schema validation
      schemas.payload.parse(data)

      // Send data to the API
      const response = await apiClient.post<ResetPasswordResponseDto>('/auth/reset-password', data)
      return schemas.response.parse(response)
    },
    onError: (error) => {
      console.error(tAuth('errors.tk_resetPasswordError_'), error)
    }
  })

  return {
    ...mutation,
    isLoading: mutation.isPending,
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync
  }
}
