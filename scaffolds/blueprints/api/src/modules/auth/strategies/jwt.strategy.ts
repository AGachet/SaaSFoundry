/**
 * Resources
 */
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-jwt'

/**
 * Dependencies
 */
import { EnvConfig } from '@configs/env/services/env.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { Logger } from '@common/services/logger/logger.service'

/**
 * Type
 */
import type { Request } from 'express'
import type { TokenPayload } from '@modules/auth/services/auth.service'
import type { AuthenticatedUser } from '@common/types/authenticated-request.type'

/**
 * Declaration
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    env: EnvConfig,
    private readonly prisma: PrismaService,
    private readonly logger: Logger
  ) {
    super({
      jwtFromRequest: (req: Request) => req.cookies?.['access_token'],
      ignoreExpiration: false,
      secretOrKey: env.get('JWT_SECRET_AUTH')
    })
  }

  async validate(payload: TokenPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
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
      this.logger.warn(`User not found: ${payload.sub}`, 'JwtStrategy')
      throw new UnauthorizedException('User not found')
    }

    return user
  }
}
