/**
 * Resources
 */
import { Module } from '@nestjs/common'

/**
 * Dependencies
 */
import { OrganizationController } from '@modules/organizations/controllers/organization.controller'
import { OrganizationService } from '@modules/organizations/services/organization.service'

/**
 * Declaration
 */
@Module({
  controllers: [OrganizationController],
  providers: [OrganizationService]
})
export class OrganizationsModule {}
