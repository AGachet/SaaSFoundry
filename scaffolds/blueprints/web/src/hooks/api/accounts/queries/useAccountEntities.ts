/**
 * Resources
 */
import { useQuery } from '@tanstack/react-query'
import i18next from 'i18next'
import { z } from 'zod'

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

  // Transform params to match backend DTO and remove undefined and empty values
  const cleanParams: Record<string, string | number | boolean | string[]> = {}

  if (params.page !== undefined && params.page > 0) cleanParams.page = params.page
  if (params.limit !== undefined && params.limit > 0) cleanParams.limit = params.limit
  if (params.search !== undefined && params.search.trim() !== '') cleanParams.search = params.search
  if (params.userIds !== undefined && params.userIds.length > 0) cleanParams.userIds = params.userIds
  if (params.isActive !== undefined) cleanParams.isActive = params.isActive
  if (params.includeInactiveUsers !== undefined) cleanParams.includeInactiveUsers = params.includeInactiveUsers
  if (params.orderBy !== undefined) cleanParams.orderBy = params.orderBy

  return useQuery({
    queryKey: ['account', accountId, 'entities', cleanParams],
    queryFn: async () => {
      try {
        const response = await apiClient.get<AccountEntitiesResponseDto>(`/accounts/${accountId}/entities`, cleanParams)
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
