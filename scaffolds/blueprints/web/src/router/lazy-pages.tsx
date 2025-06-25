/**
 * This file centralizes all lazy imports for pages to avoid duplication
 */
import { lazy } from 'react'

/**
 * Public pages
 */

// --- auth ---
export const SignIn = lazy(() => import('@/pages/public/auth').then((module) => ({ default: module.SignIn })))
export const SignUp = lazy(() => import('@/pages/public/auth').then((module) => ({ default: module.SignUp })))
export const ResetPasswordRequest = lazy(() => import('@/pages/public/auth').then((module) => ({ default: module.ResetPasswordRequest })))
export const ResetPassword = lazy(() => import('@/pages/public/auth').then((module) => ({ default: module.ResetPassword })))

// --- invitations ---
export const UserInvitation = lazy(() => import('@/pages/public/invitations/user-invitation').then((module) => ({ default: module.UserInvitation })))

// --- errors ---
export const NotFound = lazy(() => import('@/pages/public/errors/not-found').then((module) => ({ default: module.NotFound })))

/**
 * Private pages
 */

// --- layout ---
export const LayoutLogged = lazy(() => import('@/components/layout/layout-logged').then((module) => ({ default: module.LayoutLogged })))

// --- dashboard ---
export const Dashboard = lazy(() => import('@/pages/private/dashboard').then((module) => ({ default: module.Dashboard })))

// --- account ---
export const AccountManagement = lazy(() => import('@/pages/private/account').then((module) => ({ default: module.AccountManagement })))
