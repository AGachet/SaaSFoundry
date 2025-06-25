/**
 * Resources
 */
import { useQuery } from '@tanstack/react-query'
import i18next from 'i18next'
import { z } from 'zod'

import { useEntityCreateSchema } from '@/hooks/api/entities/mutations/useEntityCreate'
import apiClient from '@/lib/api/client'

// Translation
const tAccounts = (key: string) => i18next.t(key, { ns: 'accounts' })

/**
 * Schemas & DTOs
 */
export const useAccountSchema = () => {
  const { response: entityResponse } = useEntityCreateSchema()

  const peopleSchema = z.object({
    id: z.string(),
    firstname: z.string().nullable(),
    lastname: z.string().nullable()
  })

  const organizationSchema = z.object({
    id: z.string(),
    name: z.string()
  })

  const entityWithOrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    organization: organizationSchema.nullable()
  })

  const entitySchema = entityResponse.omit({ users: true, roles: true })

  const userRoleSchema = z.object({
    id: z.number(),
    name: z.string()
  })

  const accountUserSchema = z.object({
    id: z.string(),
    email: z.string(),
    isActive: z.boolean(),
    people: peopleSchema,
    roles: z.array(userRoleSchema),
    entities: z.array(entityWithOrganizationSchema),
    isDirectlyLinked: z.boolean(),
    createdAt: z.string().transform((str) => new Date(str)),
    updatedAt: z.string().transform((str) => new Date(str))
  })

  const accountRoleSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    isGlobal: z.boolean(),
    createdAt: z.string().transform((str) => new Date(str)),
    updatedAt: z.string().transform((str) => new Date(str))
  })

  const collectionResponseSchema = <T extends z.ZodType>(schema: T) =>
    z.object({
      count: z.number(),
      values: z.array(schema)
    })

  const response = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string().transform((str) => new Date(str)),
    updatedAt: z.string().transform((str) => new Date(str)),
    users: collectionResponseSchema(accountUserSchema),
    entities: collectionResponseSchema(entitySchema),
    roles: collectionResponseSchema(accountRoleSchema)
  })

  return { response, accountUserSchema }
}

export type AccountResponseDto = z.infer<ReturnType<typeof useAccountSchema>['response']>

/**
 * Hook declaration
 */
export const useAccount = (accountId: string) => {
  const schemas = useAccountSchema()

  return useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      try {
        const response = await apiClient.get<AccountResponseDto>(`/accounts/${accountId}`)
        return schemas.response.parse(response)
      } catch (error) {
        console.error(tAccounts('errors.tk_fetchAccountError_'), error)
        throw error
      }
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: !!accountId
  })
}
