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
const tOrganizations = (key: string) => i18next.t(key, { ns: 'organizations' })

/**
 * Schemas & DTOs
 */
export const useOrganizationUpdateSchema = () => {
  const payload = z.object({
    name: z
      .string()
      .max(100, { message: tOrganizations('fields.tk_nameMaxLength_') })
      .optional(),
    type: z
      .enum(['COMPANY', 'ASSOCIATION', 'COMMUNITY'], {
        message: tOrganizations('fields.tk_typeError_')
      })
      .optional(),
    description: z.string().max(255).optional(),
    website: z.string().max(100).optional()
  })

  const response = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['COMPANY', 'ASSOCIATION', 'COMMUNITY']),
    description: z.string().nullable(),
    website: z.string().nullable(),
    createdAt: z.string().transform((str) => new Date(str)),
    updatedAt: z.string().transform((str) => new Date(str))
  })

  return {
    payload,
    response
  }
}

export type OrganizationUpdatePayloadDto = z.infer<ReturnType<typeof useOrganizationUpdateSchema>['payload']>
export type OrganizationUpdateResponseDto = z.infer<ReturnType<typeof useOrganizationUpdateSchema>['response']>

/**
 * Hook declaration
 */
export const useOrganizationUpdate = (organizationId: string) => {
  const schemas = useOrganizationUpdateSchema()

  const mutation = useMutation({
    mutationFn: async (data: OrganizationUpdatePayloadDto) => {
      // Schema validation
      schemas.payload.parse(data)

      // Send data to the API
      const response = await apiClient.patch<OrganizationUpdateResponseDto>(`/organizations/${organizationId}`, data)
      return schemas.response.parse(response)
    },
    onError: (error) => {
      console.error(tOrganizations('errors.tk_updateOrganizationError_'), error)
    }
  })

  return {
    ...mutation,
    isLoading: mutation.isPending,
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync
  }
}
