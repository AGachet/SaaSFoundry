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
const tCommon = (key: string) => i18next.t(key, { ns: 'common' })

/**
 * Schemas & DTOs
 */
export const useSignUpSchema = () => {
  const payload = z.object({
    email: z
      .string()
      .min(1, { message: tAuth('fields.tk_emailRequired_') })
      .email({ message: tAuth('fields.tk_emailError_') }),
    password: z
      .string()
      .min(6, { message: tAuth('fields.tk_passwordMinLength_') })
      .max(40)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, {
        message: tAuth('fields.tk_passwordComplexityError_')
      }),
    locale: z
      .string()
      .optional()
      .refine((val) => !val || /^[A-Z]{2}$/.test(val), { message: tCommon('fields.tk_localeError_') })
  })

  const response = z.object({
    message: z.string(),
    confirmationToken: z.string().optional()
  })
  return {
    payload,
    response
  }
}

export type SignUpPayloadDto = z.infer<ReturnType<typeof useSignUpSchema>['payload']>
export type SignUpResponseDto = z.infer<ReturnType<typeof useSignUpSchema>['response']>

/**
 * Hook declaration
 */
export const useSignUp = () => {
  const schemas = useSignUpSchema()

  const mutation = useMutation({
    mutationFn: async (data: SignUpPayloadDto) => {
      // Schema validation
      schemas.payload.parse(data)

      // Add locale only if not provided
      const payload = {
        ...data,
        locale: data.locale || navigator.language.split('-')[0].toUpperCase()
      }

      // Send data to the API
      const response = await apiClient.post<SignUpResponseDto>('/auth/signup', payload)
      return schemas.response.parse(response)
    },
    onError: (error) => {
      console.error(tAuth('errors.tk_signupError_'), error)
    }
  })

  return {
    ...mutation,
    isLoading: mutation.isPending,
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync
  }
}
