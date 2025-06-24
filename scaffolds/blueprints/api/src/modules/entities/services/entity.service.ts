/**
 * Resources
 */
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'

/**
 * Dependencies
 */
import { AccountAccessService } from '@common/services/account-access/account-access.service'
import { Logger } from '@common/services/logger/logger.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'

/**
 * DTO
 */
import { CreateEntityDto } from '@modules/entities/dto/requests/create-entity.dto'
import { CreateEntityResponseDto } from '@modules/entities/dto/responses/create-entity.response.dto'
import { EntityUserDto, UpdateEntityUsersResponseDto } from '@modules/entities/dto/responses/update-entity-users.response.dto'

/**
 * Declaration
 */
@Injectable()
export class EntityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
    private readonly accountAccessService: AccountAccessService
  ) {}

  /**
   * Create a new entity with an associated organization
   */
  async createEntity(userId: string, createEntityDto: CreateEntityDto): Promise<CreateEntityResponseDto> {
    try {
      // Check if the organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: createEntityDto.organizationId }
      })

      if (!organization) throw new NotFoundException(`Organization with ID ${createEntityDto.organizationId} not found`)

      // Check if the account exists and user has access
      await this.accountAccessService.validateUserAccountAccess(userId, createEntityDto.accountId, 'createEntity')

      // Create the entity
      const entity = await this.prisma.entity.create({
        data: {
          isActive: true,
          name: createEntityDto.name,
          accountId: createEntityDto.accountId,
          description: createEntityDto.description || '',
          organizationId: createEntityDto.organizationId
        }
      })

      return {
        id: entity.id,
        name: entity.name,
        isActive: entity.isActive,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
        description: entity.description || '',
        organization: {
          id: organization.id,
          name: organization.name
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to create entity: ${error.message}`, 'createEntity')
      throw new BadRequestException('Failed to create entity')
    }
  }

  /**
   * Update users linked to an entity
   */
  async updateEntityUsers(userId: string, entityId: string, userIds: string[]): Promise<UpdateEntityUsersResponseDto> {
    this.logger.debug(`Managing users for entity ${entityId}`, 'updateEntityUsers')

    try {
      // Get entity with its account and users
      const entity = await this.prisma.entity.findUnique({
        where: { id: entityId },
        include: {
          account: true,
          users: {
            include: {
              user: {
                include: {
                  people: true
                }
              }
            }
          }
        }
      })

      if (!entity) {
        throw new NotFoundException(`Entity with ID ${entityId} not found`)
      }

      // Verify access to the account
      await this.accountAccessService.validateUserAccountAccess(userId, entity.accountId, 'updateEntityUsers')

      // Calculate users to add and remove
      const currentUserIds = entity.users.map((link) => link.userId)
      const usersToRemove = currentUserIds.filter((id) => !userIds.includes(id))
      const usersToAdd = userIds.filter((id) => !currentUserIds.includes(id))

      // Check if we're trying to remove all users
      if (usersToRemove.length === currentUserIds.length) {
        // Get all active users linked to the account (directly or via other entities)
        const accountUsers = await this.prisma.userAccountLink.findMany({
          where: {
            accountId: entity.accountId,
            user: { isActive: true }
          }
        })

        const otherEntitiesUsers = await this.prisma.userEntityLink.findMany({
          where: {
            entity: {
              accountId: entity.accountId,
              id: { not: entityId },
              isActive: true
            },
            user: { isActive: true }
          }
        })

        const activeUsersCount = new Set([...accountUsers.map((link) => link.userId), ...otherEntitiesUsers.map((link) => link.userId)]).size

        if (activeUsersCount === 0) {
          throw new BadRequestException('Cannot remove all users from the entity as there are no active users linked to the account or other entities')
        }
      }

      // Update users
      await this.prisma.$transaction(async (prisma) => {
        // Remove users
        if (usersToRemove.length > 0) {
          await prisma.userEntityLink.deleteMany({
            where: {
              userId: { in: usersToRemove },
              entityId
            }
          })
        }

        // Add users
        if (usersToAdd.length > 0) {
          await prisma.userEntityLink.createMany({
            data: usersToAdd.map((id) => ({
              userId: id,
              entityId
            }))
          })
        }
      })

      // Get updated users list
      const updatedUsers = await this.prisma.userEntityLink.findMany({
        where: { entityId },
        include: {
          user: {
            include: {
              people: true
            }
          }
        }
      })

      // Process users data
      const users: EntityUserDto[] = updatedUsers.map((link) => ({
        id: link.user.id,
        email: link.user.email,
        firstname: link.user.people?.firstname || null,
        lastname: link.user.people?.lastname || null,
        isActive: link.user.isActive,
        people: link.user.people
          ? {
              id: link.user.people.id,
              firstname: link.user.people.firstname,
              lastname: link.user.people.lastname
            }
          : null
      }))

      return {
        id: entity.id,
        name: entity.name,
        users
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to manage users for entity ${entityId}: ${error.message}`, 'updateEntityUsers')
      throw new BadRequestException('Failed to update entity users')
    }
  }
}
