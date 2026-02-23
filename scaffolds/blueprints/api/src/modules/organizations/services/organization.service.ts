/**
 * Resources
 */
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { OrganizationType } from '@/generated/prisma/client'

/**
 * Dependencies
 */
import { AccountAccessService } from '@common/services/account-access/account-access.service'
import { Logger } from '@common/services/logger/logger.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'
// TODO storage-service-active: import { StorageService } from '@modules/storage/services/storage.service'

/**
 * DTO
 */
import { CreateOrganizationDto } from '@modules/organizations/dto/requests/create-organization.dto'
import { UpdateOrganizationDto } from '@modules/organizations/dto/requests/update-organization.dto'
import { FetchOrganizationResponseDto } from '@modules/organizations/dto/responses/fetch_organization.response.dto'

/**
 * Declaration
 */
@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
    private readonly accountAccessService: AccountAccessService,
    // TODO storage-service-active: private readonly storageService: StorageService
  ) {}

  /**
   * Fetch organization
   */
  async fetchOrganization(userId: string, id: string): Promise<FetchOrganizationResponseDto> {
    this.logger.debug(`Getting organization with id ${id}`, 'fetchOrganization')

    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id },
        include: {
          accountsLinked: {
            select: {
              accountId: true
            }
          }
        }
      })

      if (!organization) throw new NotFoundException('Organization not found')

      // Get the first account ID (assuming one organization belongs to one account)
      const accountId = organization.accountsLinked[0]?.accountId
      if (!accountId) throw new NotFoundException('Organization is not linked to any account')

      // Verify user has access to the account
      await this.accountAccessService.validateUserAccountAccess(userId, accountId, 'fetchOrganization')

      return {
        id: organization.id,
        name: organization.name,
        type: organization.type,
        description: organization.description,
        website: organization.website,
        logoUrl: organization.logoUrl,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to get organization: ${error.message}`, 'fetchOrganization')
      throw new BadRequestException('Failed to get organization')
    }
  }

  /**
   * Create a new organization
   */
  async createOrganization(userId: string, data: CreateOrganizationDto): Promise<FetchOrganizationResponseDto> {
    this.logger.debug(`Creating new organization with name ${data.name}`, 'createOrganization')

    try {
      // Verify account exists and user has access
      await this.accountAccessService.validateUserAccountAccess(userId, data.accountId, 'createOrganization')

      // Create organization and link it to account in a transaction
      const result = await this.prisma.$transaction(async (prisma) => {
        const organization = await prisma.organization.create({
          data: {
            name: data.name,
            type: data.type,
            description: data.description,
            website: data.website,
            logoUrl: data.logoUrl
          }
        })

        // Create the link between organization and account
        await prisma.organizationAccountLink.create({
          data: {
            organizationId: organization.id,
            accountId: data.accountId
          }
        })

        return organization
      })

      return {
        id: result.id,
        name: result.name,
        type: result.type,
        description: result.description,
        website: result.website,
        logoUrl: result.logoUrl,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to create organization: ${error.message}`, 'createOrganization')
      throw new BadRequestException('Failed to create organization')
    }
  }

  /**
   * Update organization
   */
  async updateOrganization(userId: string, id: string, data: UpdateOrganizationDto): Promise<FetchOrganizationResponseDto> {
    this.logger.debug(`Updating organization with id ${id}`, 'updateOrganization')

    try {
      // Check if organization exists and get its account
      const existingOrganization = await this.prisma.organization.findUnique({
        where: { id },
        include: {
          accountsLinked: {
            select: {
              accountId: true
            }
          }
        }
      })

      if (!existingOrganization) throw new NotFoundException(`Organization with ID ${id} not found`)

      // Get the first account ID (assuming one organization belongs to one account)
      const accountId = existingOrganization.accountsLinked[0]?.accountId
      if (!accountId) throw new NotFoundException('Organization is not linked to any account')

      // Verify user has access to the account
      await this.accountAccessService.validateUserAccountAccess(userId, accountId, 'updateOrganization')

      // Prepare update data
      const updateData: {
        name?: string
        type?: OrganizationType
        description?: string | null
        website?: string | null
        logoUrl?: string | null
      } = {}

      // Only update fields that are present in the DTO
      if (data.name !== undefined) updateData.name = data.name
      if (data.type !== undefined) updateData.type = data.type
      if (data.description !== undefined) updateData.description = data.description
      if (data.website !== undefined) updateData.website = data.website
      if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl

      // If no fields to update, return current organization
      if (Object.keys(updateData).length === 0) {
        return {
          id: existingOrganization.id,
          name: existingOrganization.name,
          type: existingOrganization.type,
          description: existingOrganization.description,
          website: existingOrganization.website,
          logoUrl: existingOrganization.logoUrl,
          createdAt: existingOrganization.createdAt,
          updatedAt: existingOrganization.updatedAt
        }
      }

      const organization = await this.prisma.organization.update({
        where: { id },
        data: updateData
      })

      return {
        id: organization.id,
        name: organization.name,
        type: organization.type,
        description: organization.description,
        website: organization.website,
        logoUrl: organization.logoUrl,
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to update organization: ${error.message}`, 'updateOrganization')
      throw new BadRequestException('Failed to update organization')
    }
  }

  // TODO storage-service-active: /**
  // TODO storage-service-active:  * Upload organization logo
  // TODO storage-service-active:  */
  // TODO storage-service-active: async uploadLogo(userId: string, id: string, file: Express.Multer.File): Promise<FetchOrganizationResponseDto> {
  // TODO storage-service-active:   this.logger.debug(`Uploading logo for organization ${id}`, 'uploadLogo')
  // TODO storage-service-active:   try {
  // TODO storage-service-active:     const organization = await this.prisma.organization.findUnique({
  // TODO storage-service-active:       where: { id },
  // TODO storage-service-active:       include: { accountsLinked: { select: { accountId: true } } }
  // TODO storage-service-active:     })
  // TODO storage-service-active:     if (!organization) throw new NotFoundException(`Organization with ID ${id} not found`)
  // TODO storage-service-active:     const accountId = organization.accountsLinked[0]?.accountId
  // TODO storage-service-active:     if (!accountId) throw new NotFoundException('Organization is not linked to any account')
  // TODO storage-service-active:     await this.accountAccessService.validateUserAccountAccess(userId, accountId, 'uploadLogo')
  // TODO storage-service-active:     // Delete old logo if exists
  // TODO storage-service-active:     if (organization.logoUrl) {
  // TODO storage-service-active:       const oldKey = this.storageService.extractKeyFromUrl(organization.logoUrl)
  // TODO storage-service-active:       if (oldKey) await this.storageService.deleteFile(oldKey).catch(() => {})
  // TODO storage-service-active:     }
  // TODO storage-service-active:     // Upload new logo
  // TODO storage-service-active:     const key = this.storageService.buildKey(accountId, 'organizations', id, 'logos', file.originalname)
  // TODO storage-service-active:     const logoUrl = await this.storageService.uploadFile(key, file.buffer, file.mimetype)
  // TODO storage-service-active:     // Update organization with new logo URL
  // TODO storage-service-active:     const updated = await this.prisma.organization.update({ where: { id }, data: { logoUrl } })
  // TODO storage-service-active:     return {
  // TODO storage-service-active:       id: updated.id, name: updated.name, type: updated.type,
  // TODO storage-service-active:       description: updated.description, website: updated.website,
  // TODO storage-service-active:       logoUrl: updated.logoUrl, createdAt: updated.createdAt, updatedAt: updated.updatedAt
  // TODO storage-service-active:     }
  // TODO storage-service-active:   } catch (error) {
  // TODO storage-service-active:     if (error instanceof NotFoundException || error instanceof UnauthorizedException) throw error
  // TODO storage-service-active:     this.logger.error(`Failed to upload logo: ${error.message}`, 'uploadLogo')
  // TODO storage-service-active:     throw new BadRequestException('Failed to upload logo')
  // TODO storage-service-active:   }
  // TODO storage-service-active: }
}
