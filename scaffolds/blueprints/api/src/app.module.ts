/**
 * Resources
 */
import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { ScheduleModule } from '@nestjs/schedule'

/**
 * Dependencies
 */
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter'
import { AccountAccessModule } from '@common/services/account-access/account-access.module'
import { LoggerModule } from '@common/services/logger/logger.module'
import { EnvModule } from '@configs/env/env.module'
import { PrismaModule } from '@configs/prisma/prisma.module'
import { AccountsModule } from '@modules/accounts/accounts.module'
import { ApiDocsModule } from '@modules/api-docs/api-docs.module'
import { AuthModule } from '@modules/auth/auth.module'
import { EntitiesModule } from '@modules/entities/entities.module'
import { HealthModule } from '@modules/health/health.module'
import { InvitationModule } from '@modules/invitation/invitation.module'
import { OrganizationsModule } from '@modules/organizations/organizations.module'
// TODO storage-service-active: import { StorageModule } from '@modules/storage/storage.module'

/**
 * Declaration
 */
@Module({
  imports: [
    ...(process.env.NODE_ENV === 'development' ? [ApiDocsModule] : []),
    HealthModule,
    PrismaModule,
    AuthModule,
    LoggerModule,
    EnvModule,
    AccountAccessModule,
    AccountsModule,
    OrganizationsModule,
    EntitiesModule,
    InvitationModule,
    // TODO storage-service-active: StorageModule,
    ScheduleModule.forRoot()
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter
    }
  ],
  exports: []
})
export class AppModule {}
