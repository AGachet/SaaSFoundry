/**
 * Resources
 */
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'

/**
 * Dependencies
 */
import { EnvModule } from '@configs/env/env.module'
import { EnvConfig } from '@configs/env/services/env.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { AuthController } from '@modules/auth/controllers/auth.controller'
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard'
import { AuthService } from '@modules/auth/services/auth.service'
import { JwtStrategy } from '@modules/auth/strategies/jwt.strategy'
import { EmailModule } from '@modules/email/email.module'

/**
 * Declaration
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [EnvModule],
      useFactory: (env: EnvConfig) => ({
        secret: env.get('JWT_SECRET_AUTH'),
        signOptions: {
          expiresIn: env.get('JWT_AUTH_EXPIRES_IN')
        }
      }),
      inject: [EnvConfig]
    }),
    EmailModule
  ],
  providers: [AuthService, PrismaService, JwtAuthGuard, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService]
})
export class AuthModule {}
