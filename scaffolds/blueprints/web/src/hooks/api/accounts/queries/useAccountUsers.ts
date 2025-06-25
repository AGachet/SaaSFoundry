/**
 * Resources
 */
import { useQuery } from '@tanstack/react-query'
import i18next from 'i18next'
import { z } from 'zod'

import apiClient from '@/lib/api/client'
import { useAccountSchema } from './useAccount'

// Translation
const tAccounts = (key: string) => i18next.t(key, { ns: 'accounts' })

/**
 * Schemas & DTOs
 */
export const useAccountUsersSchema = () => {
  const schemas = useAccountSchema()

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
    items: z.array(schemas.accountUserSchema),
    meta: metaSchema
  })

  return { response: paginatedResponseSchema }
}

export type AccountUsersResponseDto = z.infer<ReturnType<typeof useAccountUsersSchema>['response']>

export enum UserOrderBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  NAME = 'name',
  LASTNAME = 'lastname'
}

export interface FetchAccountUsersParams {
  page?: number
  limit?: number
  search?: string
  roleIds?: number[]
  entityIds?: string[]
  isActive?: boolean
  orderBy?: UserOrderBy
  includeDirectUsers?: boolean
}

/**
 * Hook declaration
 */
export const useAccountUsers = (accountId: string, params: FetchAccountUsersParams = {}) => {
  const schemas = useAccountUsersSchema()

  // Transform params to match backend DTO and remove undefined and empty values
  const cleanParams: Record<string, string | number | boolean | string[] | number[]> = {}

  if (params.page !== undefined && params.page > 0) cleanParams.page = params.page
  if (params.limit !== undefined && params.limit > 0) cleanParams.limit = params.limit
  if (params.search !== undefined && params.search.trim() !== '') cleanParams.search = params.search
  if (params.roleIds !== undefined && params.roleIds.length > 0) cleanParams.roleIds = params.roleIds
  if (params.entityIds !== undefined && params.entityIds.length > 0) cleanParams.entityIds = params.entityIds
  if (params.isActive !== undefined) cleanParams.isActive = params.isActive
  if (params.orderBy !== undefined) cleanParams.orderBy = params.orderBy
  if (params.includeDirectUsers !== undefined) cleanParams.includeDirectUsers = params.includeDirectUsers

  return useQuery({
    queryKey: ['account', accountId, 'users', cleanParams],
    queryFn: async () => {
      try {
        const response = await apiClient.get<AccountUsersResponseDto>(`/accounts/${accountId}/users`, cleanParams)
        return schemas.response.parse(response)
      } catch (error) {
        console.error(tAccounts('errors.tk_fetchAccountUsersError_'), error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
    retry: false,
    enabled: !!accountId
  })
}
