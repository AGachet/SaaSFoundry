/**
 * Dependencies
 */
import { useGuest, useMe } from '@/hooks/api/auth'

/**
 * Hook declaration
 */
export const useModuleAccess = () => {
  const { data: me } = useMe()
  const { data: guest } = useGuest()

  const hasModuleAccess = (module: string): boolean => {
    return !!me?.modules?.includes(module) || !!guest?.modules?.includes(module)
  }

  const hasPermission = (permission: string): boolean => {
    return !!me?.permissions?.includes(permission) || !!guest?.permissions?.includes(permission)
  }

  return {
    hasModuleAccess,
    hasPermission
  }
}
