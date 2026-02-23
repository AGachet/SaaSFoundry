/**
 * Resources
 */
import { Module } from '@nestjs/common'

/**
 * Dependencies
 */
import { OrganizationController } from '@modules/organizations/controllers/organization.controller'
import { OrganizationService } from '@modules/organizations/services/organization.service'
// TODO storage-service-active: import { StorageModule } from '@modules/storage/storage.module'

/**
 * Declaration
 */
@Module({
  // TODO storage-service-active: imports: [StorageModule],
  controllers: [OrganizationController],
  providers: [OrganizationService]
})
export class OrganizationsModule {}
