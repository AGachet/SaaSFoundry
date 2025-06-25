/**
 * Resources
 */
import { RouteObject } from 'react-router-dom'

/**
 * Dependencies
 */
import { AccountManagement, Dashboard, LayoutLogged } from '@/router/lazy-pages'
import { LazyRouteElement } from '@/router/lazy-route-element'
import { ModuleAccessRoute, PrivateOnlyRoute } from '@/router/routes-guard'

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
          },
          {
            path: 'account',
            element: <ModuleAccessRoute module="ACCOUNT_ADMINISTRATION" />,
            children: [
              {
                index: true,
                element: LazyRouteElement(AccountManagement)
              }
            ]
          }
          // Add other protected routes here
        ]
      }
    ]
  }
]
