/**
 * Resources
 */
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { OrganizationType } from '@prisma/client'

/**
 * Dependencies
 */
import { AccountAccessService } from '@common/services/account-access/account-access.service'
import { Logger } from '@common/services/logger/logger.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'

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
    private readonly accountAccessService: AccountAccessService
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
            website: data.website
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
      } = {}

      // Only update fields that are present in the DTO
      if (data.name !== undefined) updateData.name = data.name
      if (data.type !== undefined) updateData.type = data.type
      if (data.description !== undefined) updateData.description = data.description
      if (data.website !== undefined) updateData.website = data.website

      // If no fields to update, return current organization
      if (Object.keys(updateData).length === 0) {
        return {
          id: existingOrganization.id,
          name: existingOrganization.name,
          type: existingOrganization.type,
          description: existingOrganization.description,
          website: existingOrganization.website,
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
        createdAt: organization.createdAt,
        updatedAt: organization.updatedAt
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to update organization: ${error.message}`, 'updateOrganization')
      throw new BadRequestException('Failed to update organization')
    }
  }
}
