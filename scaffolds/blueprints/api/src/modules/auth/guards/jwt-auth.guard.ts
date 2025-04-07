/**
 * Resources
 */
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

/**
 * Dependencies
 */
import { AuthService } from '@modules/auth/services/auth.service'
import { Logger } from '@common/services/logger/logger.service'

/**
 * Type
 */
import type { Request, Response } from 'express'

/**
 * Declaration
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: Logger
  ) {
    super()
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
      const tokens = await this.authService.refreshTokens(refreshToken)
      this.authService.setAuthCookies(response, tokens.accessToken, tokens.refreshToken)

      return (await super.canActivate(context)) as boolean
    } catch (error) {
      this.logger.warn(`Failed to refresh token for ${request.ip}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'JwtAuthGuard')
      throw new UnauthorizedException('Token refresh failed')
    }
  }
}
