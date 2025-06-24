/**
 * Common test data for unit tests
 */

export const mockUser = {
  id: '1',
  email: 'test@example.com',
  password: 'hashedPassword',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date()
}

export const mockAccount = {
  id: '1',
  name: 'Test Account',
  description: 'Test Account Description',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
}

export const mockOrganization = {
  id: '1',
  name: 'Test Organization',
  type: 'COMPANY',
  description: 'Test Organization Description',
  website: 'https://test-org.com',
  createdAt: new Date(),
  updatedAt: new Date()
}

export const mockEntity = {
  id: '1',
  name: 'Test Entity',
  description: 'Test Entity Description',
  isActive: true,
  accountId: mockAccount.id,
  organizationId: mockOrganization.id,
  createdAt: new Date(),
  updatedAt: new Date()
}

export const mockUserAccountLink = {
  userId: mockUser.id,
  accountId: mockAccount.id,
  createdAt: new Date(),
  updatedAt: new Date(),
  account: mockAccount,
  indirectAccess: false
}

export const mockRole = {
  id: 1,
  name: 'Admin',
  isActive: true,
  accountId: mockAccount.id,
  createdAt: new Date(),
  updatedAt: new Date()
}

export const mockToken = {
  id: '1',
  userId: mockUser.id,
  token: 'valid.refresh.token',
  type: 'SESSION_REFRESH',
  expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  user: mockUser
}
