import { BreadcrumbContext } from '@/components/ui/custom/breadcrumb-context'
import { useContext } from 'react'

export function useBreadcrumb() {
  const context = useContext(BreadcrumbContext)
  if (!context) {
    throw new Error('useBreadcrumb must be used within a BreadcrumbProvider')
  }
  return context
}
