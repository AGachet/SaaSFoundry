/**
 * Resources
 */
import { Module } from '@nestjs/common'

/**
 * Dependencies
 */
import { EntitiesController } from './controllers/entity.controller'
import { EntityService } from './services/entity.service'

/**
 * Declaration
 */
@Module({
  controllers: [EntitiesController],
  providers: [EntityService]
})
export class EntitiesModule {}
