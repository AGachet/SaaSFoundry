enum UserRoles {
  GUEST = 1,
  USER = 2
}

enum Locales {
  FR = 'FR',
  EN = 'EN'
}

export const UserDefaults = {
  roles: {
    default: UserRoles.USER
  },
  preferences: {
    locale: Locales.EN
  }
} as const
