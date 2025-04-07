/**
 * Resources
 */
import { createBrowserRouter } from 'react-router-dom'

/**
 * Routes
 */
import { privateRoutes } from './private-routes'
import { publicRoutes } from './public-routes'

/**
 * Router
 */
export const router = createBrowserRouter([...publicRoutes, ...privateRoutes])
