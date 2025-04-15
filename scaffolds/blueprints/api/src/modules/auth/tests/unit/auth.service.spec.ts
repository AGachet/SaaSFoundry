/**
 * Resources
 */
import { BadRequestException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'

/**
 * Dependencies
 */
import { Logger } from '@common/services/logger/logger.service'
import { EnvConfig } from '@configs/env/services/env.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { mockChalk, mockWinston } from '@configs/test/unit-mocks-glob'
import { AuthService } from '@modules/auth/services/auth.service'
import { EmailService } from '@modules/email/services/email.service'

/**
 * Type
 */
import { Response } from 'express'

/**
 * Mocks
 */
jest.mock('bcrypt')
jest.mock('@nestjs/jwt')
jest.mock('@configs/prisma/services/prisma.service')
jest.mock('@common/services/logger/logger.service')
jest.mock('@configs/env/services/env.service')
jest.mock('@modules/email/services/email.service')

/**
 * Test Data
 */
const mockUser = {
  id: '1',
  email: 'batman@diamondforge.fr',
  password: 'brucewaynepassword',
  firstname: 'Bruce',
  lastname: 'Wayne',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date()
}

const mockToken = 'mock.jwt.token'

const mockTokenRecord = {
  id: '1',
  userId: '1',
  token: 'valid.refresh.token',
  type: 'SESSION_REFRESH',
  expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
  user: {
    ...mockUser,
    rolesLinked: [
      {
        role: {
          modulesLinked: [{ module: { name: 'USER_ACCOUNT_PASSWORD_RECOVERY' } }],
          permissionsLinked: [{ permission: { name: 'PASSWORD_RECOVERY_RESET_OWN' } }]
        }
      }
    ]
  }
}

const mockUserWithRoles = {
  ...mockUser,
  rolesLinked: [
    {
      role: {
        name: 'USER',
        isActive: true,
        modulesLinked: [
          {
            module: {
              name: 'USER_ACCOUNT',
              isActive: true
            }
          }
        ],
        permissionsLinked: [
          {
            permission: {
              name: 'READ_OWN_PROFILE',
              module: {
                isActive: true
              }
            }
          }
        ]
      }
    }
  ]
}

const mockJwtService = {
  sign: jest.fn().mockReturnValue(mockToken),
  verify: jest.fn().mockReturnValue({ email: mockUser.email, sub: mockUser.id })
}

/**
 * Declaration
 */
describe('AuthService', () => {
  let service: AuthService
  let prismaService: jest.Mocked<PrismaService>
  let jwtService: jest.Mocked<JwtService>
  let env: jest.Mocked<EnvConfig>
  let logger: jest.Mocked<Logger>

  beforeEach(async () => {
    // Reset global mocks
    Object.values(mockChalk).forEach((mock: jest.Mock) => mock.mockClear())
    Object.values(mockWinston.format).forEach((mock: jest.Mock) => mock.mockClear())
    mockWinston.createLogger.mockClear()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findFirst: jest.fn()
            },
            userToken: {
              create: jest.fn(),
              deleteMany: jest.fn(),
              findFirst: jest.fn(),
              delete: jest.fn()
            },
            role: {
              findFirst: jest.fn()
            }
          }
        },
        {
          provide: JwtService,
          useValue: mockJwtService
        },
        {
          provide: Logger,
          useValue: {
            debug: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
          }
        },
        {
          provide: EnvConfig,
          useValue: {
            get: jest.fn()
          }
        },
        {
          provide: EmailService,
          useValue: {
            sendAccountConfirmationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn()
          }
        }
      ]
    }).compile()

    service = module.get<AuthService>(AuthService)
    prismaService = module.get(PrismaService)
    jwtService = module.get(JwtService)
    env = module.get(EnvConfig)
    logger = module.get(Logger)

    // Mock env values
    env.get.mockImplementation((key: string) => {
      const envValues: Record<string, string> = {
        NODE_ENV: 'test',
        JWT_SECRET_AUTH: 'auth-secret',
        JWT_SECRET_REFRESH: 'refresh-secret',
        JWT_SECRET_CONFIRM_ACCOUNT: 'confirm-secret',
        JWT_SECRET_RESET_PASSWORD: 'reset-secret',
        JWT_AUTH_EXPIRES_IN: '1h',
        JWT_REFRESH_EXPIRES_IN: '7d',
        JWT_CREATE_ACCOUNT_EXPIRES_IN: '24h',
        JWT_RESET_PASSWORD_EXPIRES_IN: '1h'
      }
      return envValues[key] || ''
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('signUp', () => {
    const signUpDto = {
      email: 'test@example.com',
      password: 'password123',
      firstname: 'John',
      lastname: 'Doe'
    }

    it('should create a new user successfully', async () => {
      // Mock prisma responses
      ;(prismaService.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prismaService.user.create as jest.Mock).mockResolvedValue(mockUser)
      ;(prismaService.userToken.create as jest.Mock).mockResolvedValue({ id: '1', token: mockToken })

      // Mock bcrypt
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword')

      const result = await service.signUp(signUpDto)

      expect(result).toEqual({
        message: 'If the email address is valid, you will receive a confirmation email shortly.',
        confirmationToken: mockToken
      })
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: signUpDto.email,
          firstname: signUpDto.firstname,
          lastname: signUpDto.lastname,
          password: 'hashedPassword',
          isActive: false
        }
      })
      expect(logger.debug).toHaveBeenCalledWith('Sign-up attempt for test@example.com', 'signUp')
    })

    it('should handle existing user gracefully', async () => {
      ;(prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser)

      const result = await service.signUp(signUpDto)

      expect(result).toEqual({
        message: 'If the email address is valid, you will receive a confirmation email shortly.'
      })
      expect(prismaService.user.create).not.toHaveBeenCalled()
      expect(logger.warn).toHaveBeenCalledWith('Sign-up attempt with existing email: test@example.com', 'signUp')
    })
  })

  describe('signIn', () => {
    const signInDto = {
      email: 'test@example.com',
      password: 'password123'
    }

    it('should sign in user successfully', async () => {
      // Mock validateUser
      ;(prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      // Mock generateTokens
      ;(prismaService.userToken.create as jest.Mock).mockResolvedValue({ id: '1', token: mockToken })

      const result = await service.signIn(signInDto)

      expect(result).toEqual({
        userId: mockUser.id,
        accessToken: mockToken,
        refreshToken: mockToken
      })
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { email: signInDto.email },
        data: expect.any(Object)
      })
      expect(logger.debug).toHaveBeenCalledWith('Sign-in attempt for test@example.com', 'signIn')
    })

    it('should throw UnauthorizedException if credentials are invalid', async () => {
      ;(prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(service.signIn(signInDto)).rejects.toThrow(UnauthorizedException)
      expect(logger.warn).toHaveBeenCalledWith('Invalid password for user: test@example.com', 'validateUser')
    })
  })

  describe('signOut', () => {
    const signOutDto = {
      userId: '1'
    }

    it('should sign out user successfully', async () => {
      ;(prismaService.userToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 })

      const result = await service.signOut(signOutDto)

      expect(result).toEqual({ message: 'Logged out successfully' })
      expect(prismaService.userToken.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: signOutDto.userId,
          type: 'SESSION_REFRESH'
        }
      })
      expect(logger.debug).toHaveBeenCalledWith('Logging out user with ID: 1', 'signout')
    })
  })

  describe('requestPasswordReset', () => {
    const requestPasswordResetDto = {
      email: 'test@example.com'
    }

    it('should request password reset successfully', async () => {
      ;(prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        rolesLinked: [
          {
            role: {
              modulesLinked: [{ module: { name: 'USER_ACCOUNT_PASSWORD_RECOVERY' } }],
              permissionsLinked: [{ permission: { name: 'PASSWORD_RECOVERY_LINK_REQUEST_OWN' } }]
            }
          }
        ]
      })
      ;(prismaService.userToken.create as jest.Mock).mockResolvedValue({ id: '1', token: mockToken })

      const result = await service.requestPasswordReset(requestPasswordResetDto)

      expect(result).toEqual({
        message: 'If the email address is valid and has permission to reset password, you will receive reset instructions shortly.',
        resetToken: mockToken
      })
      expect(logger.debug).toHaveBeenCalledWith('Password reset requested for test@example.com', 'requestPasswordReset')
    })

    it('should handle user without permission gracefully', async () => {
      ;(prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockUser,
        rolesLinked: [
          {
            role: {
              modulesLinked: [],
              permissionsLinked: []
            }
          }
        ]
      })

      const result = await service.requestPasswordReset(requestPasswordResetDto)

      expect(result).toEqual({
        message: 'If the email address is valid and has permission to reset password, you will receive reset instructions shortly.'
      })
      expect(logger.warn).toHaveBeenCalledWith('Password reset requested for non-existent user or without permissions: test@example.com', 'requestPasswordReset')
    })
  })

  describe('resetPassword', () => {
    const resetPasswordDto = {
      resetPasswordToken: 'valid.reset.token',
      password: 'newPassword123',
      confirmPassword: 'newPassword123'
    }

    it('should reset password successfully', async () => {
      ;(prismaService.userToken.findFirst as jest.Mock).mockResolvedValue(mockTokenRecord)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword')
      ;(prismaService.user.update as jest.Mock).mockResolvedValue({ ...mockUser, password: 'newHashedPassword' })
      ;(prismaService.userToken.delete as jest.Mock).mockResolvedValue(mockTokenRecord)

      const result = await service.resetPassword(resetPasswordDto)

      expect(result).toEqual({ message: 'Password has been reset successfully' })
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { password: 'newHashedPassword' }
      })
      expect(prismaService.userToken.delete).toHaveBeenCalledWith({
        where: { id: mockTokenRecord.id }
      })
      expect(logger.debug).toHaveBeenCalledWith('Password reset attempt', 'resetPassword')
    })

    it('should throw BadRequestException if passwords do not match', async () => {
      const invalidDto = {
        ...resetPasswordDto,
        confirmPassword: 'differentPassword'
      }

      await expect(service.resetPassword(invalidDto)).rejects.toThrow(BadRequestException)
      expect(logger.warn).toHaveBeenCalledWith('Passwords do not match', 'resetPassword')
    })

    it('should throw BadRequestException if token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new UnauthorizedException('Invalid token')
      })

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(UnauthorizedException)
      expect(logger.warn).toHaveBeenCalledWith('Invalid token: valid.reset.token', 'verifyToken')
    })

    it('should throw UnauthorizedException if user has no permission', async () => {
      jwtService.verify.mockReturnValue({ email: mockUser.email, sub: mockUser.id })
      ;(prismaService.userToken.findFirst as jest.Mock).mockResolvedValue({
        ...mockTokenRecord,
        user: {
          ...mockUser,
          rolesLinked: [
            {
              role: {
                modulesLinked: [],
                permissionsLinked: []
              }
            }
          ]
        }
      })

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(UnauthorizedException)
      expect(logger.warn).toHaveBeenCalledWith('User batman@diamondforge.fr does not have access to password reset', 'resetPassword')
    })
  })

  describe('getMe', () => {
    it('should return user information successfully', async () => {
      ;(prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUserWithRoles)

      const result = await service.getMe(mockUser.id)

      expect(result).toEqual({
        userId: mockUser.id,
        firstname: mockUser.firstname,
        lastname: mockUser.lastname,
        email: mockUser.email,
        roles: ['USER'],
        modules: ['USER_ACCOUNT'],
        permissions: ['READ_OWN_PROFILE'],
        createdAt: mockUser.createdAt
      })
      expect(logger.debug).toHaveBeenCalledWith('Getting user information for 1', 'getMe')
    })

    it('should throw BadRequestException if user not found', async () => {
      ;(prismaService.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(service.getMe('non-existent-id')).rejects.toThrow(BadRequestException)
      expect(logger.warn).toHaveBeenCalledWith('User not found: non-existent-id', 'getMe')
    })
  })

  describe('getGuest', () => {
    const mockGuestRole = {
      name: 'guest',
      isActive: true,
      modulesLinked: [
        {
          module: {
            name: 'USER_ACCOUNT_CREATION',
            isActive: true
          }
        }
      ],
      permissionsLinked: [
        {
          permission: {
            name: 'USER_ACCOUNT_CREATE_OWN',
            module: {
              isActive: true
            }
          }
        }
      ]
    }

    it('should return guest information successfully', async () => {
      ;(prismaService.role.findFirst as jest.Mock).mockResolvedValue(mockGuestRole)

      const result = await service.getGuest()

      expect(result).toEqual({
        roles: ['guest'],
        modules: ['USER_ACCOUNT_CREATION'],
        permissions: ['USER_ACCOUNT_CREATE_OWN']
      })
      expect(logger.debug).toHaveBeenCalledWith('Getting guest user information', 'getGuest')
    })

    it('should return empty arrays if guest role not found', async () => {
      ;(prismaService.role.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await service.getGuest()

      expect(result).toEqual({
        roles: ['guest'],
        modules: [],
        permissions: []
      })
      expect(logger.warn).toHaveBeenCalledWith('Guest role not found, returning empty arrays', 'getGuest')
    })

    it('should filter out inactive modules', async () => {
      const mockGuestRoleWithInactiveModule = {
        ...mockGuestRole,
        modulesLinked: [
          {
            module: {
              name: 'USER_ACCOUNT_CREATION',
              isActive: true
            }
          },
          {
            module: {
              name: 'INACTIVE_MODULE',
              isActive: false
            }
          }
        ]
      }

      ;(prismaService.role.findFirst as jest.Mock).mockResolvedValue(mockGuestRoleWithInactiveModule)

      const result = await service.getGuest()

      expect(result.modules).toEqual(['USER_ACCOUNT_CREATION'])
      expect(result.modules).not.toContain('INACTIVE_MODULE')
    })

    it('should filter out permissions from inactive modules', async () => {
      const mockGuestRoleWithInactiveModulePermission = {
        ...mockGuestRole,
        permissionsLinked: [
          {
            permission: {
              name: 'USER_ACCOUNT_CREATE_OWN',
              module: {
                isActive: true
              }
            }
          },
          {
            permission: {
              name: 'INACTIVE_MODULE_PERMISSION',
              module: {
                isActive: false
              }
            }
          }
        ]
      }

      ;(prismaService.role.findFirst as jest.Mock).mockResolvedValue(mockGuestRoleWithInactiveModulePermission)

      const result = await service.getGuest()

      expect(result.permissions).toEqual(['USER_ACCOUNT_CREATE_OWN'])
      expect(result.permissions).not.toContain('INACTIVE_MODULE_PERMISSION')
    })
  })

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      jwtService.verify.mockReturnValue({ email: mockUser.email, sub: mockUser.id })
      ;(prismaService.userToken.findFirst as jest.Mock).mockResolvedValue(mockTokenRecord)
      jwtService.sign.mockReturnValueOnce('new.access.token').mockReturnValueOnce('valid.refresh.token')

      const result = await service.refreshTokens('valid.refresh.token')

      expect(result).toEqual({
        accessToken: 'new.access.token',
        refreshToken: 'valid.refresh.token'
      })
      expect(logger.debug).toHaveBeenCalledWith('Tokens generated successfully for batman@diamondforge.fr', 'generateTokens')
    })

    it('should generate new refresh token if current one is expired', async () => {
      jwtService.verify.mockReturnValue({ email: mockUser.email, sub: mockUser.id })
      ;(prismaService.userToken.findFirst as jest.Mock).mockResolvedValue({
        ...mockTokenRecord,
        expiresAt: new Date(Date.now() - 3600000) // 1 hour ago
      })
      jwtService.sign.mockReturnValueOnce('new.access.token').mockReturnValueOnce('new.refresh.token')
      ;(prismaService.userToken.create as jest.Mock).mockResolvedValue({
        ...mockTokenRecord,
        token: 'new.refresh.token'
      })

      const result = await service.refreshTokens('valid.refresh.token')

      expect(result).toEqual({
        accessToken: 'new.access.token',
        refreshToken: 'new.refresh.token'
      })
      expect(logger.debug).toHaveBeenCalledWith('Tokens generated successfully for batman@diamondforge.fr', 'generateTokens')
    })

    it('should throw UnauthorizedException if refresh token is invalid', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      await expect(service.refreshTokens('invalid.token')).rejects.toThrow(UnauthorizedException)
      expect(logger.warn).toHaveBeenCalledWith('Invalid token: invalid.token', 'verifyToken')
    })

    it('should throw UnauthorizedException if user has been deleted', async () => {
      ;(jwtService.verify as jest.Mock).mockReturnValue({ sub: '123' })
      ;(prismaService.userToken.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prismaService.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(jwtService.sign as jest.Mock).mockImplementation(() => {
        throw new UnauthorizedException('User not found')
      })

      await expect(service.refreshTokens('valid.refresh.token')).rejects.toThrow(UnauthorizedException)
      expect(logger.warn).toHaveBeenCalledWith('Invalid refresh token: valid.refresh.token', 'refreshTokens')
    })
  })

  describe('Cookie Management', () => {
    it('should set auth cookies correctly', () => {
      const mockResponse = {
        cookie: jest.fn(),
        clearCookie: jest.fn()
      } as unknown as Response

      service.setAuthCookies(mockResponse, 'access.token', 'refresh.token')
      expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', 'access.token', expect.any(Object))
      expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', 'refresh.token', expect.any(Object))
      expect(logger.debug).toHaveBeenCalledWith('Setting auth cookies for user', 'setAuthCookies')
    })

    it('should clear auth cookies correctly', () => {
      const mockResponse = {
        cookie: jest.fn(),
        clearCookie: jest.fn()
      } as unknown as Response

      service.clearAuthCookies(mockResponse)
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object))
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object))
      expect(logger.debug).toHaveBeenCalledWith('Clearing auth cookies for user', 'clearAuthCookies')
    })
  })
})
