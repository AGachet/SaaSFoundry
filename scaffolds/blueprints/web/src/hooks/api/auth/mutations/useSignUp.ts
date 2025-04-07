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
export const useSignUpSchema = () => {
  const payload = z.object({
    firstname: z.string().min(1, { message: tAuth('fields.tk_firstNameError_') }),
    lastname: z.string().min(1, { message: tAuth('fields.tk_lastNameError_') }),
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
      })
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

      // Send data to the API
      const response = await apiClient.post<SignUpResponseDto>('/auth/signup', data)
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
