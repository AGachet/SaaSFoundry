/**
 * This file centralizes all lazy imports for pages to avoid duplication
 */
import { lazy } from 'react'

// Public pages
export const SignIn = lazy(() => import('@/pages/public/auth').then((module) => ({ default: module.SignIn })))
export const SignUp = lazy(() => import('@/pages/public/auth').then((module) => ({ default: module.SignUp })))
export const ResetPasswordRequest = lazy(() => import('@/pages/public/auth').then((module) => ({ default: module.ResetPasswordRequest })))
export const ResetPassword = lazy(() => import('@/pages/public/auth').then((module) => ({ default: module.ResetPassword })))
export const NotFound = lazy(() => import('@/pages/public/errors/not-found').then((module) => ({ default: module.NotFound })))

// Private pages
export const LayoutLogged = lazy(() => import('@/components/layout/layout-logged').then((module) => ({ default: module.LayoutLogged })))
export const Dashboard = lazy(() => import('@/pages/private/dashboard').then((module) => ({ default: module.Dashboard })))
