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
export const useOrganizationCreateSchema = () => {
  const payload = z.object({
    name: z
      .string()
      .min(1, { message: tOrganizations('fields.tk_nameRequired_') })
      .max(100, { message: tOrganizations('fields.tk_nameMaxLength_') }),
    type: z.enum(['COMPANY', 'ASSOCIATION', 'COMMUNITY'], {
      message: tOrganizations('fields.tk_typeError_')
    }),
    accountId: z.string().min(1, { message: tOrganizations('fields.tk_accountIdRequired_') }),
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

export type OrganizationCreatePayloadDto = z.infer<ReturnType<typeof useOrganizationCreateSchema>['payload']>
export type OrganizationCreateResponseDto = z.infer<ReturnType<typeof useOrganizationCreateSchema>['response']>

/**
 * Hook declaration
 */
export const useOrganizationCreate = () => {
  const schemas = useOrganizationCreateSchema()

  const mutation = useMutation({
    mutationFn: async (data: OrganizationCreatePayloadDto) => {
      // Schema validation
      schemas.payload.parse(data)

      // Send data to the API
      const response = await apiClient.post<OrganizationCreateResponseDto>('/organizations', data)
      return schemas.response.parse(response)
    },
    onError: (error) => {
      console.error(tOrganizations('errors.tk_createOrganizationError_'), error)
    }
  })

  return {
    ...mutation,
    isLoading: mutation.isPending,
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync
  }
}
