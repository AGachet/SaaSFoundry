/**
 * Resources
 */
import { useQuery } from '@tanstack/react-query'
import i18next from 'i18next'
import { z } from 'zod'

import { cleanParams } from '@/hooks/api/utils/cleanParams'
import apiClient from '@/lib/api/client'

// Translation
const tAccounts = (key: string) => i18next.t(key, { ns: 'accounts' })

/**
 * Schemas & DTOs
 */
export const useAccountEntitiesSchema = () => {
  const organizationSchema = z.object({
    id: z.string(),
    name: z.string()
  })

  const entitySchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    organization: organizationSchema.nullable(),
    createdAt: z.string().transform((str) => new Date(str)),
    updatedAt: z.string().transform((str) => new Date(str))
  })

  const paginationSchema = z.object({
    current: z.number(),
    limit: z.number(),
    total: z.number()
  })

  const metaSchema = z.object({
    pagination: paginationSchema,
    count: z.number()
  })

  const paginatedResponseSchema = z.object({
    items: z.array(entitySchema),
    meta: metaSchema
  })

  return { response: paginatedResponseSchema }
}

export type AccountEntitiesResponseDto = z.infer<ReturnType<typeof useAccountEntitiesSchema>['response']>

export enum EntityOrderBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  NAME = 'name',
  ORGANIZATION_NAME = 'organizationName'
}

export interface FetchAccountEntitiesParams {
  page?: number
  limit?: number
  search?: string
  userIds?: string[]
  isActive?: boolean
  includeInactiveUsers?: boolean
  orderBy?: EntityOrderBy
}

/**
 * Hook declaration
 */
export const useAccountEntities = (accountId: string, params: FetchAccountEntitiesParams = {}) => {
  const schemas = useAccountEntitiesSchema()

  const queryParams = cleanParams(params as Record<string, string | number | boolean | string[] | undefined>)

  return useQuery({
    queryKey: ['account', accountId, 'entities', queryParams],
    queryFn: async () => {
      try {
        const response = await apiClient.get<AccountEntitiesResponseDto>(`/accounts/${accountId}/entities`, queryParams)
        return schemas.response.parse(response)
      } catch (error) {
        console.error(tAccounts('errors.tk_fetchAccountEntitiesError_'), error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
    retry: false,
    enabled: !!accountId
  })
}
