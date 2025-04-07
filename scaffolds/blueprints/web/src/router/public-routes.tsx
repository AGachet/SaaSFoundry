/**
 * Resources
 */
import { Navigate, RouteObject } from 'react-router-dom'

/**
 * Dependencies
 */
import { NotFound, ResetPassword, ResetPasswordRequest, SignIn, SignUp } from '@/router/lazy-pages'
import { LazyRouteElement } from '@/router/lazy-route-element'
import { ModuleAccessRoute, PublicOnlyRoute } from '@/router/routes-guard'

/**
 * Routes
 */
export const publicRoutes: RouteObject[] = [
  {
    path: '/',
    element: <PublicOnlyRoute />,
    errorElement: LazyRouteElement(NotFound),
    children: [
      {
        path: '/',
        element: <Navigate to="/signin" replace />
      },
      {
        path: 'signin',
        element: LazyRouteElement(SignIn)
      },
      {
        path: 'signup',
        element: LazyRouteElement(SignUp)
      },
      {
        path: 'reset-password-request',
        element: <ModuleAccessRoute module="USER_ACCOUNT_PASSWORD_RECOVERY" />,
        children: [
          {
            index: true,
            element: LazyRouteElement(ResetPasswordRequest)
          }
        ]
      },
      {
        path: 'reset-password',
        element: <ModuleAccessRoute module="USER_ACCOUNT_PASSWORD_RECOVERY" />,
        children: [
          {
            index: true,
            element: LazyRouteElement(ResetPassword)
          }
        ]
      }
      // Add other public routes here
    ]
  }
]
