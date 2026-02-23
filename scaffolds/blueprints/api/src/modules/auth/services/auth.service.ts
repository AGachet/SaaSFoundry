/**
 * Resources
 */
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Locale, TokenType } from '@/generated/prisma/client'
import * as bcrypt from 'bcrypt'
import { Response } from 'express'
import ms from 'ms'

/**
 * Dependencies
 */
import { Logger } from '@common/services/logger/logger.service'
import { UserDefaults } from '@configs/db/user.config'
import { EnvConfig } from '@configs/env/services/env.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { EmailService } from '@modules/email/services/email.service'

/**
 * Type
 */
import type { User, UserToken } from '@/generated/prisma/client'

import type { RequestPasswordResetDto } from '@modules/auth/dto/requests/request-password-reset.dto'
import type { ResetPasswordDto } from '@modules/auth/dto/requests/reset-password.dto'
import type { SignInDto } from '@modules/auth/dto/requests/signin.dto'

import type { SignUpDto } from '@modules/auth/dto/requests/signup.dto'

import type { GuestResponseDto } from '@modules/auth/dto/responses/guest.response.dto'
import type { AccountDto, EntityDto, MeResponseDto } from '@modules/auth/dto/responses/me.response.dto'
import type { RequestPasswordResetResponseDto } from '@modules/auth/dto/responses/request-password-reset.response.dto'
import type { ResetPasswordResponseDto } from '@modules/auth/dto/responses/reset-password.response.dto'
import type { SignInResponseDto } from '@modules/auth/dto/responses/signin.response.dto'
import type { SignOutResponseDto } from '@modules/auth/dto/responses/signout.response.dto'
import type { SignUpResponseDto } from '@modules/auth/dto/responses/signup.response.dto'

export interface TokenPayload {
  email: string
  sub: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

/**
 * Declaration
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly logger: Logger,
    private readonly env: EnvConfig,
    private readonly emailService: EmailService
  ) {}

  /**
   * End points methods
   */
  public async signUp(signUpDto: SignUpDto): Promise<SignUpResponseDto> {
    const response: SignUpResponseDto = {
      message: 'If the email address is valid, you will receive a confirmation email shortly.'
    }
    const { email, password, locale } = signUpDto

    this.logger.debug(`Sign-up attempt for ${email}`, 'signUp')

    // Check if the user already exists
    const existingUser = await this.prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      this.logger.warn(`Sign-up attempt with existing email: ${email}`, 'signUp')
      return response
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the user (inactive by default)
    // Person will be created at first login when the account is activated
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isActive: false
      }
    })

    // Generate the confirmation token
    const confirmationToken = this.jwtService.sign(
      { email: user.email, sub: user.id },
      {
        secret: this.env.get('JWT_SECRET_CONFIRM_ACCOUNT'),
        expiresIn: this.env.get('JWT_CREATE_ACCOUNT_EXPIRES_IN')
      }
    )

    // Save the token in the database (will delete any existing token of same type)
    await this.createUniqueToken(user.id, confirmationToken, 'ACCOUNT_VALIDATION', this.env.get('JWT_CREATE_ACCOUNT_EXPIRES_IN'))

    // Log the token in development and test
    if (['development', 'test'].includes(this.env.get('NODE_ENV'))) {
      this.logger.debug(`User created successfully. \n\n------ Confirmation token for ${email} ------ \n${confirmationToken}\n`, 'signUp')
      response.confirmationToken = confirmationToken // Only displayed in development and test
    }

    // Send confirmation email
    if (this.env.get('NODE_ENV') !== 'test') {
      console.log('sendAccountConfirmationEmail', locale)
      // TODO mailer-service-active: await this.emailService.sendAccountConfirmationEmail(email, confirmationToken, 'User', locale)
    }

    this.logger.debug(`Sign-up successful for ${email}`, 'signUp')
    return response
  }

  public async signIn(signInDto: SignInDto): Promise<SignInResponseDto & AuthTokens> {
    const { email, password, confirmAccountToken, firstname, lastname, locale } = signInDto

    this.logger.debug(`Sign-in attempt for ${email}`, 'signIn')

    // Validate user
    const user = await this.validateUser(email, password)

    // Check if account is active or if confirmation token is provided
    if (!user.isActive && !confirmAccountToken) {
      this.logger.warn(`Login attempt for inactive account: ${email}`, 'signIn')
      throw new UnauthorizedException('Invalid email or password')
    }

    // Activate user account if a token is provided
    if (confirmAccountToken) {
      // Check if firstname and lastname are provided - they are required for first login
      if (!firstname || !lastname) {
        this.logger.warn(`Missing required firstname or lastname for first login: ${email}`, 'signIn')
        throw new BadRequestException('First name and last name are required for account activation')
      }

      await this.validateTokenAndActivateUser(user.id, email, confirmAccountToken, firstname, lastname, locale || UserDefaults.preferences.locale)
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user)

    // Update last login date
    await this.prisma.user.update({
      where: { email },
      data: { lastLoginAt: new Date() }
    })

    this.logger.debug(`Sign-in attempt successfully for ${email}`, 'signIn')
    return { accessToken, refreshToken, userId: user.id }
  }

  public async signOut(userId: string): Promise<SignOutResponseDto> {

    this.logger.debug(`Logging out user with ID: ${userId}`, 'signout')

    // Delete refresh tokens from the database
    await this.prisma.userToken.deleteMany({
      where: {
        userId,
        type: 'SESSION_REFRESH'
      }
    })

    this.logger.debug(`User ${userId} logged out successfully`, 'signOut')
    return { message: 'Logged out successfully' }
  }

  public async requestPasswordReset(requestPasswordResetDto: RequestPasswordResetDto): Promise<RequestPasswordResetResponseDto> {
    const response: RequestPasswordResetResponseDto = {
      message: 'If the email address is valid and has permission to reset password, you will receive reset instructions shortly.'
    }
    const { email } = requestPasswordResetDto

    this.logger.debug(`Password reset requested for ${email}`, 'requestPasswordReset')

    // Get user with roles and check access in one query
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        people: true,
        rolesLinked: {
          include: {
            role: {
              include: {
                modulesLinked: {
                  where: {
                    module: {
                      name: 'USER_ACCOUNT_PASSWORD_RECOVERY'
                    }
                  }
                },
                permissionsLinked: {
                  where: {
                    permission: {
                      name: 'PASSWORD_RECOVERY_LINK_REQUEST_OWN'
                    }
                  }
                }
              }
            }
          }
        },
        preference: true
      }
    })

    // If the user does not exist or does not have the permissions, still return a success message
    if (!user || !user.rolesLinked.some((userRole) => userRole.role.modulesLinked.length > 0) || !user.rolesLinked.some((userRole) => userRole.role.permissionsLinked.length > 0)) {
      this.logger.warn(`Password reset requested for non-existent user or without permissions: ${email}`, 'requestPasswordReset')
      return response
    }

    // Generate reset token
    const resetToken = this.jwtService.sign(
      { email: user.email, sub: user.id },
      {
        secret: this.env.get('JWT_SECRET_RESET_PASSWORD'),
        expiresIn: this.env.get('JWT_RESET_PASSWORD_EXPIRES_IN')
      }
    )

    // Save token in database (will delete any existing token of same type)
    await this.createUniqueToken(user.id, resetToken, 'PASSWORD_RESET', this.env.get('JWT_RESET_PASSWORD_EXPIRES_IN'))

    // Return token in development and test
    if (['development', 'test'].includes(this.env.get('NODE_ENV'))) {
      response.resetToken = resetToken // Only in development and test
    }

    // Send reset password email
    if (this.env.get('NODE_ENV') !== 'test') {
      // TODO mailer-service-active: const firstName = user.people?.firstname || 'User'
      // TODO mailer-service-active: await this.emailService.sendPasswordResetEmail(email, resetToken, firstName, user.preference?.locale || UserDefaults.preferences.locale)
    }

    this.logger.debug(`Password reset link sent to ${email}`, 'requestPasswordReset')
    return response
  }

  public async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    const { resetPasswordToken, password, confirmPassword } = resetPasswordDto

    this.logger.debug('Password reset attempt', 'resetPassword')

    if (password !== confirmPassword) {
      this.logger.warn('Passwords do not match', 'resetPassword')
      throw new BadRequestException('Passwords do not match')
    }

    const payload = await this.verifyToken(resetPasswordToken, this.env.get('JWT_SECRET_RESET_PASSWORD'))

    // Get token record and check access in one query
    const tokenRecord = await this.prisma.userToken.findFirst({
      where: {
        userId: payload.sub,
        token: resetPasswordToken,
        type: 'PASSWORD_RESET'
      },
      include: {
        user: {
          include: {
            rolesLinked: {
              include: {
                role: {
                  include: {
                    modulesLinked: {
                      where: {
                        module: {
                          name: 'USER_ACCOUNT_PASSWORD_RECOVERY'
                        }
                      }
                    },
                    permissionsLinked: {
                      where: {
                        permission: {
                          name: 'PASSWORD_RECOVERY_RESET_OWN'
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!tokenRecord) {
      this.logger.warn(`Invalid or expired reset password token for ${payload.email}`, 'resetPassword')
      throw new NotFoundException('Invalid or expired reset password token')
    }

    // Check if user has access to password reset
    const hasModuleAccess = tokenRecord.user.rolesLinked.some((userRole) => userRole.role.modulesLinked.length > 0)
    const hasPermission = tokenRecord.user.rolesLinked.some((userRole) => userRole.role.permissionsLinked.length > 0)

    if (!hasModuleAccess || !hasPermission) {
      this.logger.warn(`User ${payload.email} does not have access to password reset`, 'resetPassword')
      throw new UnauthorizedException('You do not have permission to reset passwords')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update password
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { password: hashedPassword }
    })

    // Delete used token
    await this.prisma.userToken.delete({
      where: { id: tokenRecord.id }
    })

    this.logger.debug(`Password reset successfully for ${payload.email}`, 'resetPassword')
    return { message: 'Password has been reset successfully' }
  }

  public async getMe(userId: string): Promise<MeResponseDto> {
    this.logger.debug(`Getting user information for ${userId}`, 'getMe')

    try {
      // Get user with roles and modules
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          people: true,
          rolesLinked: {
            include: {
              role: {
                include: {
                  modulesLinked: {
                    include: {
                      module: true
                    }
                  },
                  permissionsLinked: {
                    include: {
                      permission: {
                        include: {
                          module: true
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          accountsLinked: {
            include: {
              account: true
            }
          },
          entitiesLinked: {
            include: {
              entity: {
                include: {
                  organization: true
                }
              }
            }
          }
        }
      })

      if (!user) {
        this.logger.warn(`User not found: ${userId}`, 'getMe')
        throw new NotFoundException('User not found')
      }

      // Extract roles from user roles (names only)
      const roles = user.rolesLinked.map((userRole) => userRole.role.name)

      // Extract modules from active roles (modules attached and active)
      const modules = user.rolesLinked
        .flatMap((userRole) => userRole.role.modulesLinked.filter((moduleLink) => moduleLink.module.isActive).map((moduleLink) => moduleLink.module.name))
        .filter((value, index, self) => self.indexOf(value) === index) // Remove possible duplicates

      // Extract permissions from active roles (permissions attached to active roles and modules)
      const permissions = user.rolesLinked
        .flatMap((userRole) => userRole.role.permissionsLinked.filter((permissionLink) => permissionLink.permission.module?.isActive).map((permissionLink) => permissionLink.permission.name))
        .filter((value, index, self) => self.indexOf(value) === index) // Remove possible duplicates

      // Transform user.accountsLinked into AccountDto objects
      const accounts: AccountDto[] = user.accountsLinked.map((link) => ({
        id: link.account.id,
        name: link.account.name,
        description: link.account.description,
        isActive: link.account.isActive
      }))

      // Extract user.entitiesLinked into EntityDto objects
      const entities = user.entitiesLinked.map((link) => {
        const entityData: EntityDto = {
          id: link.entity.id,
          name: link.entity.name,
          isActive: link.entity.isActive,
          accountId: link.entity.accountId,
          organization: null
        }

        // Only set organization if it exists
        if (link.entity.organization) {
          entityData.organization = {
            id: link.entity.organization.id,
            name: link.entity.organization.name
          }
        }

        return entityData
      })

      return {
        userId: user.id,
        email: user.email,
        people: {
          firstname: user.people?.firstname || null,
          lastname: user.people?.lastname || null
        },
        roles,
        modules,
        permissions,
        accounts,
        entities,
        createdAt: user.createdAt
      }
    } catch (error) {
      this.logger.error(`Failed to get user information for ${userId}: ${error.message}`, 'getMe')
      if (error instanceof NotFoundException) {
        throw error
      }
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException('Failed to get user information')
    }
  }

  public async getGuest(): Promise<GuestResponseDto> {
    this.logger.debug('Getting guest user information', 'getGuest')

    // Get guest role with modules and permissions
    const guestRole = await this.prisma.role.findFirst({
      where: { name: 'guest', isActive: true },
      include: {
        modulesLinked: {
          where: {
            module: {
              isActive: true
            }
          },
          include: {
            module: true
          }
        },
        permissionsLinked: {
          include: {
            permission: {
              include: {
                module: true
              }
            }
          }
        }
      }
    })

    // If no guest role found, return empty arrays
    if (!guestRole) {
      this.logger.warn('Guest role not found, returning empty arrays', 'getGuest')
      return {
        roles: ['guest'],
        modules: [],
        permissions: []
      }
    }

    // Extract modules from active roles (modules attached and active)
    const modules = guestRole.modulesLinked.filter((moduleLink) => moduleLink.module.isActive).map((moduleLink) => moduleLink.module.name)

    // Extract permissions from active roles (permissions attached to active roles and modules)
    const permissions = guestRole.permissionsLinked.filter((permissionLink) => permissionLink.permission.module?.isActive).map((permissionLink) => permissionLink.permission.name)

    return {
      roles: ['guest'],
      modules,
      permissions
    }
  }

  /**
   * Privates methods
   */
  private async validateUser(email: string, password: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) {
      this.logger.warn(`User not found: ${email}`, 'validateUser')
      throw new UnauthorizedException('Invalid email or password')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for user: ${email}`, 'validateUser')
      throw new UnauthorizedException('Invalid email or password')
    }

    this.logger.debug(`User ${email} validated successfully`, 'validateUser')
    return user
  }

  private async validateTokenAndActivateUser(userId: string, email: string, confirmAccountToken: string, firstname: string, lastname: string, locale?: Locale): Promise<User> {
    await this.verifyToken(confirmAccountToken, this.env.get('JWT_SECRET_CONFIRM_ACCOUNT'))

    // Find the token record
    const tokenRecord = await this.prisma.userToken.findFirst({
      where: {
        userId,
        token: confirmAccountToken,
        type: 'ACCOUNT_VALIDATION'
      }
    })

    if (!tokenRecord) {
      this.logger.warn(`Invalid confirmation token for ${email}`, 'validateTokenAndActivateUser')
      throw new NotFoundException('Invalid confirmation token')
    }

    // Activate the user profile
    const updatedUser = await this.createAndActivateUserProfile(userId, email, firstname, lastname, {
      locale,
      createDefaultAccount: true
    })

    // Delete the token after activation
    await this.prisma.userToken.delete({
      where: { id: tokenRecord.id }
    })

    this.logger.debug(`Sign-up process completed for ${email}`, 'validateTokenAndActivateUser')
    return updatedUser
  }

  /**
   * Shared methods
   */
  public async createUniqueToken(userId: string, token: string, type: TokenType, expiresIn: ms.StringValue): Promise<UserToken> {
    // Delete any existing token of the same type for this user
    await this.prisma.userToken.deleteMany({
      where: {
        userId,
        type
      }
    })

    // Create new token
    return this.prisma.userToken.create({
      data: {
        userId,
        token,
        type,
        expiresAt: new Date(Date.now() + ms(expiresIn))
      }
    })
  }

  public async verifyToken(token: string, secret: string): Promise<TokenPayload> {
    try {
      const decoded = this.jwtService.verify(token, { secret }) as TokenPayload
      return decoded
    } catch {
      this.logger.warn(`Invalid token: ${token}`, 'verifyToken')
      throw new UnauthorizedException('Invalid token')
    }
  }

  public async generateTokens(user: { email: string; id: string }, existingTokenRecord?: UserToken): Promise<AuthTokens> {
    const payload: TokenPayload = { email: user.email, sub: user.id }

    // Default secret and expiresIn for access token (from auth.module.ts)
    const accessToken = this.jwtService.sign(payload)

    // Check if the refresh token exists and is still valid
    if (existingTokenRecord?.expiresAt) {
      const remainingTime = existingTokenRecord.expiresAt.getTime() - Date.now()
      const oneDay = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

      if (remainingTime > oneDay) {
        return { accessToken, refreshToken: existingTokenRecord.token }
      }
    }

    // Generate new refresh token if needed
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.env.get('JWT_SECRET_REFRESH'),
      expiresIn: this.env.get('JWT_REFRESH_EXPIRES_IN')
    })

    // Store the new refresh token in the UserTokens table (will delete any existing token of same type)
    await this.createUniqueToken(user.id, refreshToken, 'SESSION_REFRESH', this.env.get('JWT_REFRESH_EXPIRES_IN'))

    this.logger.debug(`Tokens generated successfully for ${user.email}`, 'generateTokens')
    return { accessToken, refreshToken }
  }

  public async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = await this.verifyToken(refreshToken, this.env.get('JWT_SECRET_REFRESH'))

      const tokenRecord = await this.prisma.userToken.findFirst({
        where: {
          userId: payload.sub,
          token: refreshToken,
          type: 'SESSION_REFRESH'
        }
      })

      if (!tokenRecord) {
        this.logger.warn(`Invalid refresh token: ${refreshToken}`, 'refreshTokens')
        throw new UnauthorizedException('Invalid refresh token')
      }

      return this.generateTokens({ id: payload.sub, email: payload.email }, tokenRecord)
    } catch (error) {
      this.logger.error(`Error refreshing token: ${error instanceof Error ? error.message : 'Unknown error'}`, 'refreshTokens')
      throw error
    }
  }

  public setAuthCookies(response: Response, accessToken: string, refreshToken: string): void {
    this.logger.debug('Setting auth cookies for user', 'setAuthCookies')
    response.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: !['development', 'test'].includes(this.env.get('NODE_ENV')),
      sameSite: 'strict',
      path: '/'
    })
    response.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: !['development', 'test'].includes(this.env.get('NODE_ENV')),
      sameSite: 'strict',
      path: '/'
    })
  }

  public clearAuthCookies(response: Response): void {
    this.logger.debug('Clearing auth cookies for user', 'clearAuthCookies')
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: !['development', 'test'].includes(this.env.get('NODE_ENV')),
      sameSite: 'strict',
      path: '/'
    })
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: !['development', 'test'].includes(this.env.get('NODE_ENV')),
      sameSite: 'strict',
      path: '/'
    })
  }

  public decodeToken(token: string): TokenPayload | null {
    try {
      return this.jwtService.decode(token) as TokenPayload
    } catch {
      this.logger.warn('Failed to decode token', 'decodeToken')
      return null
    }
  }

  public async createAndActivateUserProfile(
    userId: string,
    email: string,
    firstname: string,
    lastname: string,
    options: {
      accountIds?: string[]
      entityIds?: string[]
      roleIds?: number[]
      locale?: Locale
      createDefaultAccount?: boolean
    } = {}
  ): Promise<User> {
    const { accountIds = [], entityIds = [], roleIds = [], locale, createDefaultAccount = false } = options

    try {
      this.logger.debug(`Creating profile for user ${email}`, 'createAndActivateUserProfile')

      // Use a single transaction to ensure consistency for all operations
      return await this.prisma.$transaction(async (tx) => {
        // Create People record
        const person = await tx.people.create({
          data: {
            firstname,
            lastname,
            email
          }
        })

        // Create a default Account if needed and none specified
        let defaultAccountId: string | undefined = undefined
        if (createDefaultAccount && accountIds.length === 0 && entityIds.length === 0) {
          const defaultAccount = await tx.account.create({
            data: {}
          })
          defaultAccountId = defaultAccount.id
        }

        // Update user with isActive status and link to person
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: {
            isActive: true,
            peopleId: person.id,
            preference: {
              create: {
                locale: locale || UserDefaults.preferences.locale
              }
            }
          }
        })

        // Add the specified accounts or the default account
        if (accountIds.length > 0 || defaultAccountId) {
          await tx.userAccountLink.createMany({
            data: [
              ...accountIds.map((accountId) => ({
                userId,
                accountId
              })),
              ...(defaultAccountId ? [{ userId, accountId: defaultAccountId }] : [])
            ]
          })
        }

        // Add the specified entities
        if (entityIds.length > 0) {
          await tx.userEntityLink.createMany({
            data: entityIds.map((entityId) => ({
              userId,
              entityId
            }))
          })
        }

        // Add the specified roles or the default role
        if (roleIds.length > 0) {
          await tx.userRoleLink.createMany({
            data: roleIds.map((roleId) => ({
              userId,
              roleId
            }))
          })
        } else {
          // Resolve the role by name instead of using hardcoded IDs
          const roleName = defaultAccountId ? UserDefaults.roles.admin : UserDefaults.roles.default
          const role = await tx.role.findFirst({ where: { name: roleName } })
          if (!role) throw new BadRequestException(`Default role '${roleName}' not found`)

          await tx.userRoleLink.create({
            data: {
              userId,
              roleId: role.id
            }
          })
        }

        return updatedUser
      })
    } catch (error) {
      this.logger.error(`Failed to create profile for ${email}: ${error.message}`, 'createAndActivateUserProfile')
      throw new BadRequestException(`Failed to create user profile: ${error.message}`)
    }
  }
}
