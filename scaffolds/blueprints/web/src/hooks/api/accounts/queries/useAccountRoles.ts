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

  const queryParams = cleanParams(params as Record<string, string | number | boolean | undefined>)

  return useQuery({
    queryKey: ['account', accountId, 'roles', queryParams],
    queryFn: async () => {
      try {
        const response = await apiClient.get<AccountRolesResponseDto>(`/accounts/${accountId}/roles`, queryParams)
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
