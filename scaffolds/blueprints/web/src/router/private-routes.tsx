/**
 * Resources
 */
import { RouteObject } from 'react-router-dom'

/**
 * Dependencies
 */
import { Dashboard, LayoutLogged } from '@/router/lazy-pages'
import { LazyRouteElement } from '@/router/lazy-route-element'
import { PrivateOnlyRoute } from '@/router/routes-guard'

/**
 * Routes
 */
export const privateRoutes: RouteObject[] = [
  {
    path: '/',
    element: <PrivateOnlyRoute />,
    children: [
      {
        element: LazyRouteElement(LayoutLogged),
        children: [
          {
            path: 'dashboard',
            element: LazyRouteElement(Dashboard)
          }
          // Add other protected routes here
        ]
      }
    ]
  }
]
