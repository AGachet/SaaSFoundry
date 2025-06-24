/**
 * Refactored unit tests for AuthService using the new testing infrastructure
 */

import { NotFoundException, Provider, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { Response } from 'express'

/**
 * Dependencies
 */
import { Logger } from '@common/services/logger/logger.service'
import { EnvConfig } from '@configs/env/services/env.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { AuthService } from '@modules/auth/services/auth.service'
import { EmailService } from '@modules/email/services/email.service'

/**
 * Test infrastructure
 */
import { ServiceTestBase } from '@common/tests/unit/base/service-test-base'
import { TestDataFactory } from '@common/tests/unit/builders/test-data-builders'
import { mockEmailService, mockEnvConfig, mockJwtService, mockLogger, mockPrismaService } from '@common/tests/unit/mocks/service-mocks'
import { MockManager, TestAssertions, TestScenario } from '@common/tests/unit/utils/advanced-test-utils'
import { createMockResponse } from '@common/tests/unit/utils/test-utils'

/**
 * Mocks
 */
jest.mock('bcrypt')

/**
 * Test implementation using the new infrastructure
 */
class AuthServiceTest extends ServiceTestBase<AuthService> {
  private mockManager = new MockManager()
  private logger: jest.Mocked<Logger>
  private prismaService: jest.Mocked<PrismaService>
  private jwtService: jest.Mocked<JwtService>
  private envConfig: jest.Mocked<EnvConfig>
  private emailService: jest.Mocked<EmailService>

  protected getServiceClass() {
    return AuthService
  }

  protected getProviders(): Provider[] {
    return [
      { provide: PrismaService, useValue: mockPrismaService },
      { provide: JwtService, useValue: mockJwtService },
      { provide: Logger, useValue: mockLogger },
      { provide: EnvConfig, useValue: mockEnvConfig },
      { provide: EmailService, useValue: mockEmailService }
    ]
  }

  protected async customSetup(): Promise<void> {
    // Configure mock implementations
    mockJwtService.sign.mockReturnValue('mock.jwt.token')
    mockJwtService.verify.mockReturnValue({ email: 'test@example.com', sub: '1' })

    mockEnvConfig.get.mockImplementation((key: string) => {
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

    // Get service references
    this.logger = this.getService(Logger)
    this.prismaService = this.getService(PrismaService)
    this.jwtService = this.getService(JwtService)
    this.envConfig = this.getService(EnvConfig)
    this.emailService = this.getService(EmailService)
  }

  /**
   * Test signUp functionality
   */
  testSignUp(): void {
    describe('signUp', () => {
      const signUpDto = {
        email: 'test@example.com',
        password: 'password123',
        firstname: 'John',
        lastname: 'Doe'
      }

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful signup', async () => {
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.user.findUnique.mockResolvedValue(null)

          const mockUser = TestDataFactory.user().withEmail(signUpDto.email).build()
          prismaServiceAny.user.create.mockResolvedValue(mockUser)
          prismaServiceAny.userToken.create.mockResolvedValue({
            id: '1',
            token: 'mock.token',
            userId: mockUser.id,
            type: 'ACCOUNT_CONFIRMATION',
            expiresAt: new Date()
          })
          ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword')
        })

        it('should create a new user successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.signUp(signUpDto)

            // Assert
            TestAssertions.assertObjectStructure(result, {
              message: 'string',
              confirmationToken: 'string'
            })

            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.user.create).toHaveBeenCalledWith({
              data: {
                email: signUpDto.email,
                password: 'hashedPassword',
                isActive: false
              }
            })
          })
        })
      })

      describe('when user already exists', () => {
        const existingUserScenario = TestScenario.create('existing user', async () => {
          const existingUser = TestDataFactory.user().withEmail(signUpDto.email).build()
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.user.findUnique.mockResolvedValue(existingUser)
        })

        it('should handle existing user gracefully', async () => {
          await existingUserScenario.execute(async () => {
            // Act
            const result = await this.service.signUp(signUpDto)

            // Assert
            expect(result).toEqual({
              message: 'If the email address is valid, you will receive a confirmation email shortly.'
            })

            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.user.create).not.toHaveBeenCalled()
          })
        })
      })
    })
  }

  /**
   * Test signIn functionality
   */
  testSignIn(): void {
    describe('signIn', () => {
      const signInDto = {
        email: 'test@example.com',
        password: 'password123'
      }

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful signin', async () => {
          const mockUser = TestDataFactory.user().withEmail(signInDto.email).withActiveStatus(true).build()

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.user.findUnique.mockResolvedValue(mockUser)
          ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
          prismaServiceAny.userToken.create.mockResolvedValue({
            id: '1',
            token: 'refresh.token',
            userId: mockUser.id,
            type: 'SESSION_REFRESH',
            expiresAt: new Date()
          })
        })

        it('should sign in user successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.signIn(signInDto)

            // Assert
            TestAssertions.assertObjectStructure(result, {
              userId: 'string',
              accessToken: 'string',
              refreshToken: 'string'
            })

            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.user.update).toHaveBeenCalledWith({
              where: { email: signInDto.email },
              data: { lastLoginAt: expect.any(Date) }
            })
          })
        })
      })

      describe('when credentials are invalid', () => {
        const invalidCredentialsScenario = TestScenario.create('invalid credentials', async () => {
          const mockUser = TestDataFactory.user().withEmail(signInDto.email).build()
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.user.findUnique.mockResolvedValue(mockUser)
          ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
        })

        it('should throw UnauthorizedException if credentials are invalid', async () => {
          await invalidCredentialsScenario.execute(async () => {
            await TestAssertions.assertThrows(() => this.service.signIn(signInDto), UnauthorizedException)
          })
        })
      })

      describe('when signing in with confirmation token', () => {
        const signInWithTokenDto = {
          ...signInDto,
          firstname: 'John',
          lastname: 'Doe',
          confirmAccountToken: 'valid.token'
        }

        const confirmationScenario = TestScenario.create('signin with confirmation', async () => {
          const mockUser = TestDataFactory.user().withEmail(signInDto.email).withActiveStatus(false).build()
          const mockAccount = TestDataFactory.account().build()

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.user.findUnique.mockResolvedValue(mockUser)
          ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
          this.jwtService.verify.mockReturnValue({ email: mockUser.email, sub: mockUser.id })
          prismaServiceAny.userToken.findFirst.mockResolvedValue({
            id: '1',
            userId: mockUser.id,
            token: 'valid.token',
            type: 'ACCOUNT_VALIDATION'
          })
          prismaServiceAny.people.create.mockResolvedValue({
            id: '2',
            firstname: 'John',
            lastname: 'Doe',
            email: 'test@example.com'
          })
          prismaServiceAny.account.create.mockResolvedValue(mockAccount)
          prismaServiceAny.user.update.mockResolvedValue({
            ...mockUser,
            isActive: true,
            peopleId: '2'
          })
          prismaServiceAny.userToken.create.mockResolvedValue({ id: '1', token: 'mock.token' })
        })

        it('should create account when signing in with confirmation token', async () => {
          await confirmationScenario.execute(async () => {
            // Act
            const result = await this.service.signIn(signInWithTokenDto)

            // Assert
            TestAssertions.assertObjectStructure(result, {
              userId: 'string',
              accessToken: 'string',
              refreshToken: 'string'
            })

            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.user.update).toHaveBeenCalledWith(
              expect.objectContaining({
                where: { email: signInWithTokenDto.email }
              })
            )
            expect(prismaServiceAny.account.create).toHaveBeenCalled()
          })
        })
      })
    })
  }

  /**
   * Test signOut functionality
   */
  testSignOut(): void {
    describe('signOut', () => {
      const signOutDto = {
        userId: '1'
      }

      const successScenario = TestScenario.create('successful signout', async () => {
        const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
        prismaServiceAny.userToken.deleteMany.mockResolvedValue({ count: 1 })
      })

      it('should sign out user successfully', async () => {
        await successScenario.execute(async () => {
          // Act
          const result = await this.service.signOut(signOutDto)

          // Assert
          expect(result).toEqual({ message: 'Logged out successfully' })

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          expect(prismaServiceAny.userToken.deleteMany).toHaveBeenCalledWith({
            where: {
              userId: signOutDto.userId,
              type: 'SESSION_REFRESH'
            }
          })
        })
      })
    })
  }

  /**
   * Test requestPasswordReset functionality
   */
  testRequestPasswordReset(): void {
    describe('requestPasswordReset', () => {
      const requestPasswordResetDto = {
        email: 'test@example.com'
      }

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful password reset request', async () => {
          const mockUser = TestDataFactory.user().withEmail(requestPasswordResetDto.email).build()

          // Add roles structure manually since UserBuilder doesn't have withRoles
          const userWithRoles = {
            ...mockUser,
            rolesLinked: [
              {
                role: {
                  modulesLinked: [{ module: { name: 'USER_ACCOUNT_PASSWORD_RECOVERY' } }],
                  permissionsLinked: [{ permission: { name: 'PASSWORD_RECOVERY_LINK_REQUEST_OWN' } }]
                }
              }
            ]
          }

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.user.findUnique.mockResolvedValue(userWithRoles)
          prismaServiceAny.userToken.create.mockResolvedValue({ id: '1', token: 'mock.token' })
        })

        it('should request password reset successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.requestPasswordReset(requestPasswordResetDto)

            // Assert
            TestAssertions.assertObjectStructure(result, {
              message: 'string',
              resetToken: 'string'
            })
          })
        })
      })

      describe('when user has no permission', () => {
        const noPermissionScenario = TestScenario.create('user without permission', async () => {
          const mockUser = TestDataFactory.user().withEmail(requestPasswordResetDto.email).build()

          // Add roles structure manually
          const userWithoutPermissions = {
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

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.user.findUnique.mockResolvedValue(userWithoutPermissions)
        })

        it('should handle user without permission gracefully', async () => {
          await noPermissionScenario.execute(async () => {
            // Act
            const result = await this.service.requestPasswordReset(requestPasswordResetDto)

            // Assert
            expect(result).toEqual({
              message: 'If the email address is valid and has permission to reset password, you will receive reset instructions shortly.'
            })
          })
        })
      })
    })
  }

  /**
   * Test resetPassword functionality
   */
  testResetPassword(): void {
    describe('resetPassword', () => {
      const resetPasswordDto = {
        resetPasswordToken: 'valid.reset.token',
        password: 'newPassword123',
        confirmPassword: 'newPassword123'
      }

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful password reset', async () => {
          const mockUser = TestDataFactory.user().build()

          // Add roles structure manually
          const userWithPermissions = {
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

          const mockTokenRecord = {
            id: '1',
            userId: mockUser.id,
            token: 'valid.reset.token',
            type: 'PASSWORD_RESET',
            expiresAt: new Date(Date.now() + 3600000),
            user: userWithPermissions
          }

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.userToken.findFirst.mockResolvedValue(mockTokenRecord)
          ;(bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword')
          prismaServiceAny.user.update.mockResolvedValue({ ...mockUser, password: 'newHashedPassword' })
          prismaServiceAny.userToken.delete.mockResolvedValue(mockTokenRecord)
        })

        it('should reset password successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.resetPassword(resetPasswordDto)

            // Assert
            expect(result).toEqual({ message: 'Password has been reset successfully' })

            const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
            expect(prismaServiceAny.user.update).toHaveBeenCalledWith({
              where: { id: expect.any(String) },
              data: { password: 'newHashedPassword' }
            })
          })
        })
      })

      describe('when user does not have permission', () => {
        const noPermissionScenario = TestScenario.create('user without reset permission', async () => {
          const mockUser = TestDataFactory.user().build()

          // Add roles structure manually without permissions
          const userWithoutPermissions = {
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

          const mockTokenRecord = {
            id: '1',
            userId: mockUser.id,
            token: 'valid.reset.token',
            type: 'PASSWORD_RESET',
            expiresAt: new Date(Date.now() + 3600000),
            user: userWithoutPermissions
          }

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.userToken.findFirst.mockResolvedValue(mockTokenRecord)
        })

        it('should throw UnauthorizedException if user does not have permission', async () => {
          await noPermissionScenario.execute(async () => {
            await TestAssertions.assertThrows(() => this.service.resetPassword(resetPasswordDto), UnauthorizedException)
          })
        })
      })
    })
  }

  /**
   * Test getMe functionality
   */
  testGetMe(): void {
    describe('getMe', () => {
      describe('when successful', () => {
        const successScenario = TestScenario.create('successful getMe', async () => {
          const mockAccount = TestDataFactory.account().build()
          const mockUser = TestDataFactory.user().build()

          // Create complete user structure manually that matches what Prisma returns
          const userWithCompleteData = {
            ...mockUser,
            people: {
              id: '2',
              firstname: 'Bruce',
              lastname: 'Wayne',
              email: 'test@example.com',
              createdAt: new Date(),
              updatedAt: new Date()
            },
            rolesLinked: [
              {
                role: {
                  name: 'USER',
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
            ],
            accountsLinked: [
              {
                account: {
                  id: mockAccount.id,
                  name: mockAccount.name,
                  description: mockAccount.description,
                  isActive: mockAccount.isActive
                }
              }
            ],
            entitiesLinked: []
          }

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.user.findUnique.mockResolvedValue(userWithCompleteData)
        })

        it('should return user information successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.getMe('1')

            // Assert - basic structure without strict type checking for now
            expect(result).toHaveProperty('userId')
            expect(result).toHaveProperty('email')
            expect(result).toHaveProperty('people')
            expect(result).toHaveProperty('roles')
            expect(result).toHaveProperty('modules')
            expect(result).toHaveProperty('permissions')
            expect(result).toHaveProperty('accounts')
            expect(result).toHaveProperty('entities')
            expect(result).toHaveProperty('createdAt')

            // Additional specific assertions
            expect(result.roles).toEqual(['USER'])
            expect(result.modules).toEqual(['USER_ACCOUNT'])
            expect(result.permissions).toEqual(['READ_OWN_PROFILE'])
          })
        })
      })

      describe('when user not found', () => {
        const notFoundScenario = TestScenario.create('user not found', async () => {
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.user.findUnique.mockResolvedValue(null)
        })

        it('should throw NotFoundException if user not found', async () => {
          await notFoundScenario.execute(async () => {
            await TestAssertions.assertThrows(() => this.service.getMe('non-existent-id'), NotFoundException)
          })
        })
      })
    })
  }

  /**
   * Test getGuest functionality
   */
  testGetGuest(): void {
    describe('getGuest', () => {
      describe('when successful', () => {
        const successScenario = TestScenario.create('successful getGuest', async () => {
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

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.role.findFirst.mockResolvedValue(mockGuestRole)
        })

        it('should return guest information successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.getGuest()

            // Assert - basic structure without strict type checking for now
            expect(result).toHaveProperty('roles')
            expect(result).toHaveProperty('modules')
            expect(result).toHaveProperty('permissions')

            // Additional specific assertions
            expect(result.roles).toEqual(['guest'])
            expect(result.modules).toEqual(['USER_ACCOUNT_CREATION'])
            expect(result.permissions).toEqual(['USER_ACCOUNT_CREATE_OWN'])
          })
        })
      })

      describe('when guest role not found', () => {
        const notFoundScenario = TestScenario.create('guest role not found', async () => {
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.role.findFirst.mockResolvedValue(null)
        })

        it('should return empty arrays if guest role not found', async () => {
          await notFoundScenario.execute(async () => {
            // Act
            const result = await this.service.getGuest()

            // Assert
            expect(result).toEqual({
              roles: ['guest'],
              modules: [],
              permissions: []
            })
          })
        })
      })

      describe('filtering inactive modules and permissions', () => {
        it('should filter out inactive modules', async () => {
          // Arrange
          const mockGuestRole = {
            name: 'guest',
            isActive: true,
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
            ],
            permissionsLinked: []
          }

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.role.findFirst.mockResolvedValue(mockGuestRole)

          // Act
          const result = await this.service.getGuest()

          // Assert
          expect(result.modules).toEqual(['USER_ACCOUNT_CREATION'])
          expect(result.modules).not.toContain('INACTIVE_MODULE')
        })

        it('should filter out permissions from inactive modules', async () => {
          // Arrange
          const mockGuestRole = {
            name: 'guest',
            isActive: true,
            modulesLinked: [],
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

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          prismaServiceAny.role.findFirst.mockResolvedValue(mockGuestRole)

          // Act
          const result = await this.service.getGuest()

          // Assert
          expect(result.permissions).toEqual(['USER_ACCOUNT_CREATE_OWN'])
          expect(result.permissions).not.toContain('INACTIVE_MODULE_PERMISSION')
        })
      })
    })
  }

  /**
   * Test refreshTokens functionality
   */
  testRefreshTokens(): void {
    describe('refreshTokens', () => {
      const refreshToken = 'valid.refresh.token'

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful refresh', async () => {
          const mockUser = TestDataFactory.user().build()
          const mockToken = TestDataFactory.token().withToken(refreshToken).withUserId(mockUser.id).withValidToken().build()

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          this.jwtService.verify.mockReturnValue({ email: mockUser.email, sub: mockUser.id })
          prismaServiceAny.userToken.findFirst.mockResolvedValue({
            ...mockToken,
            user: mockUser
          })
          this.jwtService.sign.mockReturnValueOnce('new.access.token').mockReturnValueOnce('valid.refresh.token')
        })

        it('should refresh tokens successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            const result = await this.service.refreshTokens(refreshToken)

            // Assert
            TestAssertions.assertObjectStructure(result, {
              accessToken: 'string',
              refreshToken: 'string'
            })
          })
        })
      })

      describe('when refresh token is expired', () => {
        const expiredTokenScenario = TestScenario.create('expired refresh token', async () => {
          const mockUser = TestDataFactory.user().build()
          const mockToken = {
            id: '1',
            userId: mockUser.id,
            token: refreshToken,
            type: 'SESSION_REFRESH',
            expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
            user: mockUser
          }

          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          this.jwtService.verify.mockReturnValue({ email: mockUser.email, sub: mockUser.id })
          prismaServiceAny.userToken.findFirst.mockResolvedValue(mockToken)
          this.jwtService.sign.mockReturnValueOnce('new.access.token').mockReturnValueOnce('new.refresh.token')
          prismaServiceAny.userToken.create.mockResolvedValue({
            ...mockToken,
            token: 'new.refresh.token'
          })
        })

        it('should generate new refresh token if current one is expired', async () => {
          await expiredTokenScenario.execute(async () => {
            // Act
            const result = await this.service.refreshTokens(refreshToken)

            // Assert
            TestAssertions.assertObjectStructure(result, {
              accessToken: 'string',
              refreshToken: 'string'
            })
            expect(result.refreshToken).toBe('new.refresh.token')
          })
        })
      })

      describe('when errors occur', () => {
        it('should throw UnauthorizedException if refresh token is invalid', async () => {
          // Arrange
          this.jwtService.verify.mockImplementation(() => {
            throw new Error('Invalid token')
          })

          // Act & Assert
          await TestAssertions.assertThrows(() => this.service.refreshTokens('invalid.token'), UnauthorizedException)
        })

        it('should throw UnauthorizedException if user has been deleted', async () => {
          // Arrange
          const prismaServiceAny = this.prismaService as any // eslint-disable-line @typescript-eslint/no-explicit-any
          this.jwtService.verify.mockReturnValue({ sub: '123' })
          prismaServiceAny.userToken.findFirst.mockResolvedValue(null)
          prismaServiceAny.user.findUnique.mockResolvedValue(null)

          // Act & Assert
          await TestAssertions.assertThrows(() => this.service.refreshTokens('valid.refresh.token'), UnauthorizedException)
        })
      })
    })
  }

  /**
   * Test Cookie Management functionality
   */
  testCookieManagement(): void {
    describe('Cookie Management', () => {
      it('should set auth cookies correctly', () => {
        // Arrange
        const mockResponse = createMockResponse()

        // Act
        this.service.setAuthCookies(mockResponse as unknown as Response, 'access.token', 'refresh.token')

        // Assert
        expect(mockResponse.cookie).toHaveBeenCalledWith('access_token', 'access.token', expect.any(Object))
        expect(mockResponse.cookie).toHaveBeenCalledWith('refresh_token', 'refresh.token', expect.any(Object))
      })

      it('should clear auth cookies correctly', () => {
        // Arrange
        const mockResponse = createMockResponse()

        // Act
        this.service.clearAuthCookies(mockResponse as unknown as Response)

        // Assert
        expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object))
        expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object))
      })
    })
  }
}

// Execute the tests
describe('AuthService (Refactored)', () => {
  const authServiceTest = new AuthServiceTest()

  beforeEach(async () => {
    await authServiceTest.setupTest()
  })

  afterEach(async () => {
    await authServiceTest.cleanupTest()
  })

  // Run all test suites
  authServiceTest.testSignUp()
  authServiceTest.testSignIn()
  authServiceTest.testSignOut()
  authServiceTest.testRequestPasswordReset()
  authServiceTest.testResetPassword()
  authServiceTest.testGetMe()
  authServiceTest.testGetGuest()
  authServiceTest.testRefreshTokens()
  authServiceTest.testCookieManagement()
})
