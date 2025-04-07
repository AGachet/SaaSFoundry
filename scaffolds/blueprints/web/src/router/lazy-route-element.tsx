/**
 * LazyRouteElement wrapper to avoid duplication of Suspense and PageLoader
 */
import { PageLoader } from '@/components/ui/custom/page-loader'
import { Suspense } from 'react'

export const LazyRouteElement = (Component: React.LazyExoticComponent<React.ComponentType<unknown>>) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)
