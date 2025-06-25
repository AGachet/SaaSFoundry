/**
 * Resources
 */
import { useQuery } from '@tanstack/react-query'
import i18next from 'i18next'
import { z } from 'zod'

import apiClient from '@/lib/api/client'

// Translation
const tAuth = (key: string) => i18next.t(key, { ns: 'auth' })

/**
 * Schemas & DTOs
 */
export const useMeSchema = () => {
  const accountSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean()
  })

  const organizationSchema = z.object({
    id: z.string(),
    name: z.string()
  })

  const peopleSchema = z.object({
    firstname: z.string().nullable(),
    lastname: z.string().nullable()
  })

  const entitySchema = z.object({
    id: z.string(),
    name: z.string(),
    isActive: z.boolean(),
    accountId: z.string(),
    organization: organizationSchema.nullable()
  })

  const response = z
    .object({
      userId: z.string(),
      email: z.string(),
      people: peopleSchema,
      roles: z.array(z.string()).nonempty(),
      modules: z.array(z.string()).nonempty(),
      permissions: z.array(z.string()).nonempty(),
      accounts: z.array(accountSchema),
      entities: z.array(entitySchema),
      createdAt: z.string()
    })
    .refine((data) => data.accounts.length > 0 || data.entities.length > 0, {
      message: 'Either accounts or entities must be non-empty',
      path: ['accounts', 'entities']
    })

  return { response }
}

export type MeResponseDto = z.infer<ReturnType<typeof useMeSchema>['response']>

/**
 * Hook declaration
 */
export const useMe = () => {
  const schemas = useMeSchema()

  return useQuery({
    queryKey: ['authMe'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<MeResponseDto>('/auth/me')
        localStorage.setItem('authMe', JSON.stringify(response))
        return schemas.response.parse(response)
      } catch (error) {
        console.error(tAuth('errors.tk_fetchMeError_'), error)
        throw error
      }
    },
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: false
  })
}
