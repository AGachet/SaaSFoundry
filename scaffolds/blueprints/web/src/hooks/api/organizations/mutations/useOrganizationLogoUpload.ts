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
export const useOrganizationLogoUploadSchema = () => {
  const response = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['COMPANY', 'ASSOCIATION', 'COMMUNITY']),
    description: z.string().nullable(),
    website: z.string().nullable(),
    logoUrl: z.string().nullable(),
    createdAt: z.string().transform((str) => new Date(str)),
    updatedAt: z.string().transform((str) => new Date(str))
  })

  return { response }
}

export type OrganizationLogoUploadResponseDto = z.infer<ReturnType<typeof useOrganizationLogoUploadSchema>['response']>

/**
 * Hook declaration
 */
export const useOrganizationLogoUpload = () => {
  const schemas = useOrganizationLogoUploadSchema()

  const mutation = useMutation({
    mutationFn: async ({ organizationId, file }: { organizationId: string; file: File }) => {
      const response = await apiClient.upload<OrganizationLogoUploadResponseDto>(`/organizations/${organizationId}/logo`, file)
      return schemas.response.parse(response)
    },
    onError: (error) => {
      console.error(tOrganizations('errors.tk_uploadLogoError_'), error)
    }
  })

  return {
    ...mutation,
    isLoading: mutation.isPending,
    submit: mutation.mutate,
    submitAsync: mutation.mutateAsync
  }
}
