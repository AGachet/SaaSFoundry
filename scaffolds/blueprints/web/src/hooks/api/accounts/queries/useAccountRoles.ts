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
export const useAccountRolesSchema = () => {
  const roleSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
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
    items: z.array(roleSchema),
    meta: metaSchema
  })

  return { response: paginatedResponseSchema }
}

export type AccountRolesResponseDto = z.infer<ReturnType<typeof useAccountRolesSchema>['response']>

export enum RoleOrderBy {
  CREATED_AT = 'createdAt',
  NAME = 'name'
}

export interface FetchAccountRolesParams {
  page?: number
  limit?: number
  search?: string
  isActive?: boolean
  orderBy?: RoleOrderBy
}

/**
 * Hook declaration
 */
export const useAccountRoles = (accountId: string, params: FetchAccountRolesParams = {}) => {
  const schemas = useAccountRolesSchema()

  // Transform params to match backend DTO and remove undefined and empty values
  const cleanParams: Record<string, string | number | boolean> = {}

  if (params.page !== undefined && params.page > 0) cleanParams.page = params.page
  if (params.limit !== undefined && params.limit > 0) cleanParams.limit = params.limit
  if (params.search !== undefined && params.search.trim() !== '') cleanParams.search = params.search
  if (params.isActive !== undefined) cleanParams.isActive = params.isActive
  if (params.orderBy !== undefined) cleanParams.orderBy = params.orderBy

  return useQuery({
    queryKey: ['account', accountId, 'roles', cleanParams],
    queryFn: async () => {
      try {
        const response = await apiClient.get<AccountRolesResponseDto>(`/accounts/${accountId}/roles`, cleanParams)
        return schemas.response.parse(response)
      } catch (error) {
        console.error(tAccounts('errors.tk_fetchAccountRolesError_'), error)
        throw error
      }
    },
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: false,
    retry: false,
    enabled: !!accountId
  })
}
