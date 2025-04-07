/**
 * Resources
 */
import { Navigate, Outlet } from 'react-router-dom'

/**
 * Dependencies
 */
import { useGuest } from '@/hooks/api/auth'
import { useIsSessionActive } from '@/hooks/auth/session'
import { useModuleAccess } from '@/hooks/auth/useModuleAccess'

/**
 * Types
 */
type ModuleAccessRouteProps = {
  module: string
}

/**
 * Declarations
 */
export const PrivateOnlyRoute = () => {
  const { isSessionActive } = useIsSessionActive()

  if (!isSessionActive) return <Navigate to="/signin" replace />

  return <Outlet />
}

export const PublicOnlyRoute = () => {
  const { isSessionActive } = useIsSessionActive()

  if (isSessionActive) return <Navigate to="/dashboard" replace />

  return <Outlet />
}

export const ModuleAccessRoute = ({ module }: ModuleAccessRouteProps) => {
  const { hasModuleAccess } = useModuleAccess()
  const { isLoading } = useGuest()

  if (isLoading) return null // On attend le chargement des données

  if (!hasModuleAccess(module)) return <Navigate to="/signin" replace />

  return <Outlet />
}
