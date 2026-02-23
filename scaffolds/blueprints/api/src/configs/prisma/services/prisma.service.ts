/**
 * Resources
 */
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'

/**
 * Dependencies
 */
import { EnvConfig } from '@configs/env/services/env.service'

/**
 * Declaration
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(env: EnvConfig) {
    super({
      adapter: new PrismaPg({ connectionString: env.get('DATABASE_URL') })
    })
  }

  async onModuleInit() {
    await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
