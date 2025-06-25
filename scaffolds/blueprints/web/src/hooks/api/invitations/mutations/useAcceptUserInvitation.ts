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
const tCommon = (key: string) => i18next.t(key, { ns: 'common' })

/**
 * Schemas & DTOs
 */
export const useAcceptUserInvitationSchema = () => {
  const payload = z.object({
    invitationToken: z.string().min(1, { message: tAuth('fields.tk_invitationTokenRequired_') }),
    password: z.string().min(1, { message: tAuth('fields.tk_passwordRequired_') }),
    firstname: z.string().min(1, { message: tAuth('fields.tk_firstNameError_') }),
    lastname: z.string().min(1, { message: tAuth('fields.tk_lastNameError_') }),
    locale: z
      .string()
      .optional()
      .refine((val) => !val || /^[A-Z]{2}$/.test(val), { message: tCommon('fields.tk_localeError_') })
  })

  const response = z.object({
    userId: z.string()
  })

  return { payload, response }
}

export type AcceptUserInvitationPayloadDto = z.infer<ReturnType<typeof useAcceptUserInvitationSchema>['payload']>
export type AcceptUserInvitationResponseDto = z.infer<ReturnType<typeof useAcceptUserInvitationSchema>['response']>

/**
 * Hook declaration
 */
export const useAcceptUserInvitation = () => {
  const me = useMe()
  const schemas = useAcceptUserInvitationSchema()

  const mutation = useMutation({
    mutationFn: async (data: AcceptUserInvitationPayloadDto) => {
      // Schema validation
      schemas.payload.parse(data)

      // Add locale only if not provided
      const payload = {
        ...data,
        locale: data.locale || navigator.language.split('-')[0].toUpperCase()
      }

      // Send data to the API
      const response = await apiClient.post<AcceptUserInvitationResponseDto>('/invitations/accept', payload)
      return schemas.response.parse(response)
    },
    onSuccess: async () => {
      // Remove guest access
      localStorage.removeItem('guestAccess')

      // Fetch user profile
      await me.refetch()
    },
    onError: (error) => {
      console.error(tAuth('errors.tk_acceptInvitationError_'), error)
    }
  })

  return {
    ...mutation,
    isLoading: mutation.isPending,
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync
  }
}
