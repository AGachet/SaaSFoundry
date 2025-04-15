import { Locale } from '@prisma/client'

enum UserRoles {
  GUEST = 1,
  USER = 2
}

export const UserDefaults = {
  roles: {
    default: UserRoles.USER
  },
  preferences: {
    locale: Locale.EN
  }
} as const
