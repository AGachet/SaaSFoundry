export const queryKeys = {
  auth: {
    me: ['authMe'] as const,
    guest: ['guestAccess'] as const
  },
  account: (accountId: string) => ['account', accountId] as const,
  entities: (accountId: string, params?: Record<string, unknown>) => ['account', accountId, 'entities', ...(params ? [params] : [])] as const,
  users: (accountId: string, params?: Record<string, unknown>) => ['account', accountId, 'users', ...(params ? [params] : [])] as const,
  roles: (accountId: string, params?: Record<string, unknown>) => ['account', accountId, 'roles', ...(params ? [params] : [])] as const,
  invitations: ['invitations'] as const
}
