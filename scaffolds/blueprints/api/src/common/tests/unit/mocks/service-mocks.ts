/**
 * Common service mocks for unit tests
 */

import { MockedFunction } from '@common/tests/unit/types/mocked-function.type'

export const mockLogger = {
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  log: jest.fn()
}

// Generic type for Prisma methods
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClientMethod = (...args: any[]) => Promise<unknown>

export const mockPrismaService = {
  user: {
    findUnique: jest.fn() as MockedFunction<PrismaClientMethod>,
    create: jest.fn() as MockedFunction<PrismaClientMethod>,
    update: jest.fn() as MockedFunction<PrismaClientMethod>,
    findFirst: jest.fn() as MockedFunction<PrismaClientMethod>,
    findMany: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  account: {
    findUnique: jest.fn() as MockedFunction<PrismaClientMethod>,
    create: jest.fn() as MockedFunction<PrismaClientMethod>,
    update: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  organization: {
    findUnique: jest.fn() as MockedFunction<PrismaClientMethod>,
    create: jest.fn() as MockedFunction<PrismaClientMethod>,
    update: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  entity: {
    findUnique: jest.fn() as MockedFunction<PrismaClientMethod>,
    create: jest.fn() as MockedFunction<PrismaClientMethod>,
    update: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  userAccountLink: {
    create: jest.fn() as MockedFunction<PrismaClientMethod>,
    findUnique: jest.fn() as MockedFunction<PrismaClientMethod>,
    findMany: jest.fn() as MockedFunction<PrismaClientMethod>,
    deleteMany: jest.fn() as MockedFunction<PrismaClientMethod>,
    createMany: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  userEntityLink: {
    findMany: jest.fn() as MockedFunction<PrismaClientMethod>,
    deleteMany: jest.fn() as MockedFunction<PrismaClientMethod>,
    createMany: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  userRoleLink: {
    create: jest.fn() as MockedFunction<PrismaClientMethod>,
    createMany: jest.fn() as MockedFunction<PrismaClientMethod>,
    findMany: jest.fn() as MockedFunction<PrismaClientMethod>,
    deleteMany: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  organizationAccountLink: {
    create: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  role: {
    findFirst: jest.fn() as MockedFunction<PrismaClientMethod>,
    findMany: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  userToken: {
    create: jest.fn() as MockedFunction<PrismaClientMethod>,
    deleteMany: jest.fn() as MockedFunction<PrismaClientMethod>,
    findFirst: jest.fn() as MockedFunction<PrismaClientMethod>,
    delete: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  people: {
    create: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  preference: {
    create: jest.fn() as MockedFunction<PrismaClientMethod>
  },
  $transaction: jest.fn((callback) => callback(mockPrismaService))
}

export const mockAccountAccessService = {
  validateUserAccountAccess: jest.fn()
}

export const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn().mockReturnValue({ email: 'test@example.com', sub: '1' })
}

export const mockEnvConfig = {
  get: jest.fn().mockImplementation((key: string) => {
    const envValues: Record<string, string> = {
      NODE_ENV: 'test',
      JWT_SECRET_AUTH: 'auth-secret',
      JWT_SECRET_REFRESH: 'refresh-secret',
      JWT_SECRET_CONFIRM_ACCOUNT: 'confirm-secret',
      JWT_SECRET_RESET_PASSWORD: 'reset-secret',
      JWT_SECRET_INVITATION: 'invitation-secret',
      JWT_AUTH_EXPIRES_IN: '1h',
      JWT_REFRESH_EXPIRES_IN: '7d',
      JWT_CREATE_ACCOUNT_EXPIRES_IN: '24h',
      JWT_RESET_PASSWORD_EXPIRES_IN: '1h',
      JWT_INVITATION_EXPIRES_IN: '24h',
      FRONTEND_URL: 'http://localhost:3000'
    }
    return envValues[key] || ''
  })
}

export const mockEmailService = {
  sendAccountConfirmationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  sendInvitationEmail: jest.fn()
}

export const mockAuthService = {
  createUniqueToken: jest.fn().mockResolvedValue({
    id: '1',
    token: 'mock.token',
    type: 'INVITATION',
    expiresAt: new Date(Date.now() + 86400000)
  }),
  generateAuthTokens: jest.fn().mockImplementation((userId) => {
    if (!userId) {
      throw new Error('User ID is required to generate auth tokens')
    }
    return Promise.resolve({
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token'
    })
  }),
  generateTokens: jest.fn().mockImplementation((user) => {
    if (!user || !user.id) {
      throw new Error('User with ID is required to generate tokens')
    }
    return Promise.resolve({
      accessToken: 'mock.access.token',
      refreshToken: 'mock.refresh.token'
    })
  }),
  createAndActivateUserProfile: jest.fn().mockImplementation(
    (
      userId,
      email,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      firstname,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      lastname,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      options
    ) => {
      return Promise.resolve({
        id: userId,
        email,
        isActive: true,
        password: 'hashed-password'
      })
    }
  ),
  verifyToken: jest.fn()
}

export const mockTranslationService = {
  getTranslation: jest.fn().mockReturnValue({
    subject: 'Test Subject',
    title: 'Test Title',
    body: 'Test Body',
    button: 'Test Button',
    fallback: 'Test Fallback',
    ignore: 'Test Ignore',
    footer: 'Test Footer'
  })
}

export const mockHealthCheckService = {
  check: jest.fn()
}

export const mockAppHealthCheck = {
  isHealthy: jest.fn()
}
