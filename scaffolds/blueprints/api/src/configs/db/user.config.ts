import { Locale } from '@/generated/prisma/client'

export const UserRoleNames = {
  GUEST: 'guest',
  USER: 'user',
  ADMIN: 'admin'
} as const

export const UserDefaults = {
  roles: {
    default: UserRoleNames.USER,
    admin: UserRoleNames.ADMIN
  },
  preferences: {
    locale: Locale.EN
  }
} as const
