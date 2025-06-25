/**
 * Resources
 */
import { useMutation } from '@tanstack/react-query'
import i18next from 'i18next'
import { z } from 'zod'

/**
 * Dependencies
 */
import { useOrganizationCreate } from '@/hooks/api/organizations/mutations/useOrganizationCreate'
import apiClient from '@/lib/api/client'

// Translation
const tEntities = (key: string) => i18next.t(key, { ns: 'entities' })
const tCommon = (key: string) => i18next.t(key, { ns: 'common' })

/**
 * Schemas & DTOs
 */
export const useEntityCreateSchema = () => {
  const payload = z.object({
    name: z
      .string()
      .min(2, { message: tCommon('fields.errors.tk_minLength_') })
      .max(100, { message: tCommon('fields.errors.tk_maxLength_') }),
    description: z.string().max(255).optional(),
    accountId: z.string().min(1, { message: tCommon('fields.errors.tk_required_') }),
    organization: z.object({
      name: z
        .string()
        .min(2, { message: tCommon('fields.errors.tk_minLength_') })
        .max(100, { message: tCommon('fields.errors.tk_maxLength_') }),
      type: z.enum(['COMPANY', 'ASSOCIATION', 'COMMUNITY'], {
        message: tCommon('fields.errors.tk_invalid_')
      }),
      description: z.string().max(255).optional(),
      website: z.string().max(100).optional()
    })
  })

  const response = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    organization: z
      .object({
        id: z.string(),
        name: z.string()
      })
      .optional(),
    users: z
      .array(
        z.object({
          id: z.string(),
          email: z.string(),
          isActive: z.boolean()
        })
      )
      .optional(),
    roles: z
      .array(
        z.object({
          id: z.number(),
          name: z.string(),
          isActive: z.boolean()
        })
      )
      .optional(),
    createdAt: z.string().transform((str) => new Date(str)),
    updatedAt: z.string().transform((str) => new Date(str))
  })

  return {
    payload,
    response
  }
}

export type EntityCreatePayloadDto = z.infer<ReturnType<typeof useEntityCreateSchema>['payload']>
export type EntityCreateResponseDto = z.infer<ReturnType<typeof useEntityCreateSchema>['response']>

/**
 * Hook declaration
 */
export const useEntityCreate = () => {
  const schemas = useEntityCreateSchema()
  const { submitAsync: createOrganization } = useOrganizationCreate()

  const mutation = useMutation({
    mutationFn: async (data: EntityCreatePayloadDto) => {
      // Schema validation
      schemas.payload.parse(data)

      // First, create the organization
      const organization = await createOrganization({
        name: data.organization.name,
        type: data.organization.type,
        accountId: data.accountId,
        description: data.organization.description,
        website: data.organization.website
      })
      console.log('organization', organization)
      console.log('data', data)
      // Then, create the entity with the organization ID
      const response = await apiClient.post<EntityCreateResponseDto>('/entities', {
        name: data.name,
        description: data.description,
        organizationId: organization.id,
        accountId: data.accountId
      })

      return schemas.response.parse(response)
    },
    onError: (error) => {
      console.error(tEntities('errors.tk_createEntityError_'), error)
    }
  })

  return {
    ...mutation,
    isLoading: mutation.isPending,
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync
  }
}
