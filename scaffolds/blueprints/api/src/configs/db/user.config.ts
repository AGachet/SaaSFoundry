import { Locale } from '@prisma/client'

enum UserRoles {
  GUEST = 1,
  USER = 2,
  ADMIN = 3
}

export const UserDefaults = {
  roles: {
    default: UserRoles.USER,
    admin: UserRoles.ADMIN
  },
  preferences: {
    locale: Locale.EN
  }
} as const
