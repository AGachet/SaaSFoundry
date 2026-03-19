/**
 * Resources
 */
import { ExecutionContext, Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { AuthGuard } from '@nestjs/passport'

/**
 * Dependencies
 */
import { Logger } from '@common/services/logger/logger.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { AuthService } from '@modules/auth/services/auth.service'

/**
 * Type
 */
import type { Request, Response } from 'express'

/**
 * Declaration
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') implements OnModuleInit {
  private authService: AuthService
  private prismaService: PrismaService

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly logger: Logger
  ) {
    super()
  }

  async onModuleInit() {
    // Get the service at the module initialization to avoid circular dependencies
    this.authService = this.moduleRef.get(AuthService, { strict: false })
    this.prismaService = this.moduleRef.get(PrismaService, { strict: false })
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean
    } catch (error) {
      this.logger.debug(`JWT validation failed (${error instanceof Error ? error.message : 'Unknown error'}), trying refresh token`, 'JwtAuthGuard')
      return this.tryRefreshToken(context)
    }
  }

  private async tryRefreshToken(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>()
    const response = context.switchToHttp().getResponse<Response>()

    const refreshToken = request.cookies?.['refresh_token']
    if (!refreshToken) {
      this.logger.warn(`No refresh token found for ${request.ip}`, 'JwtAuthGuard')
      throw new UnauthorizedException('No refresh token provided')
    }

    try {
      if (!this.authService) {
        try {
          this.authService = this.moduleRef.get(AuthService, { strict: false })
          this.prismaService = this.moduleRef.get(PrismaService, { strict: false })
        } catch (e) {
          this.logger.error(`Failed to get required services: ${e instanceof Error ? e.message : 'Unknown error'}`, 'JwtAuthGuard')
          throw new Error('Required services not available')
        }
      }

      const tokens = await this.authService.refreshTokens(refreshToken)

      // Define the cookies with the new tokens
      this.authService.setAuthCookies(response, tokens.accessToken, tokens.refreshToken)

      // Extract the payload from the access token
      const payload = this.authService.decodeToken(tokens.accessToken)

      // Get the user from the payload and set it directly in the request
      // Include the same relations as JwtStrategy.validate() so PermissionsGuard can work
      if (payload && payload.sub) {
        const user = await this.prismaService.user.findUnique({
          where: { id: payload.sub },
          include: {
            rolesLinked: {
              where: {
                role: {
                  isActive: true
                }
              },
              include: {
                role: {
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
                        permission: true
                      }
                    }
                  }
                }
              }
            }
          }
        })

        if (!user) {
          this.logger.warn(`User not found after token refresh: ${payload.sub}`, 'JwtAuthGuard')
          throw new UnauthorizedException('User not found')
        }

        // Define the user in the request
        request.user = user
        return true
      }

      throw new UnauthorizedException('Invalid token payload')
    } catch (error) {
      this.logger.warn(`Failed to refresh token for ${request.ip}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'JwtAuthGuard')
      throw new UnauthorizedException('Token refresh failed')
    }
  }
}
