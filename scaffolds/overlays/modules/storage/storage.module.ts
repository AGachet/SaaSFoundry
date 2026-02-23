/**
 * Resources
 */
import { Module } from '@nestjs/common'

/**
 * Dependencies
 */
import { StorageService } from '@modules/storage/services/storage.service'

/**
 * Declaration
 */
@Module({
  providers: [StorageService],
  exports: [StorageService]
})
export class StorageModule {}
