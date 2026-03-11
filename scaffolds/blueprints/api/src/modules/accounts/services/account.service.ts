/**
 * Resources
 */
import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'

/**
 * Dependencies
 */
import { AccountAccessService } from '@common/services/account-access/account-access.service'
import { Logger } from '@common/services/logger/logger.service'
import { PaginationService } from '@common/services/pagination/pagination.service'
import { PrismaService } from '@configs/prisma/services/prisma.service'

/**
 * DTO
 */
import { EntityOrderBy, FetchAccountEntitiesDto } from '@modules/accounts/dto/requests/fetch-account-entities.dto'
import { FetchAccountRolesDto, RoleOrderBy } from '@modules/accounts/dto/requests/fetch-account-roles.dto'
import { FetchAccountUsersDto, UserOrderBy } from '@modules/accounts/dto/requests/fetch-account-users.dto'
import { FetchAccountEntitiesResponseDto } from '@modules/accounts/dto/responses/fetch-account-entities.response.dto'
import { FetchAccountRolesResponseDto } from '@modules/accounts/dto/responses/fetch-account-roles.response.dto'
import { FetchAccountUsersResponseDto } from '@modules/accounts/dto/responses/fetch-account-users.response.dto'
import { FetchAccountDeepResponseDto } from '@modules/accounts/dto/responses/fetch_account.response.dto'
import { UpdateAccountStatusResponseDto } from '@modules/accounts/dto/responses/update-account-status.response.dto'
import { UpdateAccountUsersResponseDto } from '@modules/accounts/dto/responses/update-account-users.response.dto'

/**
 * Declaration
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: Logger,
    private readonly accountAccessService: AccountAccessService,
    private readonly paginationService: PaginationService
  ) {}

  /**
   * End points methods
   */
  public async fetchAccount(userId: string, accountId: string): Promise<FetchAccountDeepResponseDto> {
    this.logger.debug(`Getting information for account ${accountId}`, 'getAccountDetails')

    try {
      // Verify that the user has access to the account
      const userAccountLink = await this.accountAccessService.validateUserAccountAccess(userId, accountId, 'getAccountDetails')
      const account = userAccountLink.account

      // Get all data in parallel using a single transaction
      const [users, usersCount, recentEntities, entitiesCount, recentRoles, rolesCount] = await this.prisma.$transaction([
        // Get users
        this.prisma.user.findMany({
          where: {
            isActive: true,
            OR: [
              {
                accountsLinked: {
                  some: {
                    accountId
                  }
                }
              },
              {
                entitiesLinked: {
                  some: {
                    entity: {
                      accountId,
                      isActive: true
                    }
                  }
                }
              }
            ]
          },
          include: {
            people: true,
            rolesLinked: {
              include: {
                role: true
              }
            },
            entitiesLinked: {
              include: {
                entity: {
                  include: {
                    organization: true
                  }
                }
              }
            },
            accountsLinked: {
              where: {
                accountId
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }),
        // Count users
        this.prisma.user.count({
          where: {
            isActive: true,
            OR: [
              {
                accountsLinked: {
                  some: {
                    accountId
                  }
                }
              },
              {
                entitiesLinked: {
                  some: {
                    entity: {
                      accountId,
                      isActive: true
                    }
                  }
                }
              }
            ]
          }
        }),
        // Get entities
        this.prisma.entity.findMany({
          where: {
            accountId,
            isActive: true
          },
          include: {
            organization: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }),
        // Count entities
        this.prisma.entity.count({
          where: {
            accountId,
            isActive: true
          }
        }),
        // Get roles
        this.prisma.role.findMany({
          where: {
            OR: [{ accountId }, { accountId: null }],
            isActive: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        }),
        // Count roles
        this.prisma.role.count({
          where: {
            OR: [{ accountId }, { accountId: null }],
            isActive: true
          }
        })
      ])

      // Process users data
      const processedUsers = users.map((user) => {
        const userEntities = user.entitiesLinked
          .filter((entityLink) => entityLink.entity && entityLink.entity.accountId === accountId)
          .map((entityLink) => ({
            id: entityLink.entity.id,
            name: entityLink.entity.name,
            organization: entityLink.entity.organization
              ? {
                  id: entityLink.entity.organization.id,
                  name: entityLink.entity.organization.name
                }
              : null
          }))

        return {
          id: user.id,
          email: user.email,
          isActive: user.isActive,
          people: user.people
            ? {
                id: user.people.id,
                firstname: user.people.firstname,
                lastname: user.people.lastname
              }
            : null,
          roles: user.rolesLinked.map((roleLink) => ({
            id: roleLink.role.id,
            name: roleLink.role.name
          })),
          entities: userEntities,
          isDirectlyLinked: user.accountsLinked.length > 0,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      })

      // Process entities data
      const entities = recentEntities.map((entity) => ({
        id: entity.id,
        name: entity.name,
        description: entity.description,
        isActive: entity.isActive,
        organization: entity.organization
          ? {
              id: entity.organization.id,
              name: entity.organization.name
            }
          : null,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt
      }))

      // Process roles data
      const roles = recentRoles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        isGlobal: role.accountId === null,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt
      }))

      return {
        id: account.id,
        name: account.name,
        description: account.description,
        isActive: account.isActive,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
        users: {
          count: usersCount,
          values: processedUsers
        },
        entities: {
          count: entitiesCount,
          values: entities
        },
        roles: {
          count: rolesCount,
          values: roles
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to get account details: ${error.message}`, 'getAccountDetails')
      throw new BadRequestException('Failed to get account details')
    }
  }

  public async updateAccountStatus(userId: string, accountId: string, isActive: boolean): Promise<UpdateAccountStatusResponseDto> {
    this.logger.debug(`Updating account ${accountId} status to ${isActive ? 'active' : 'inactive'} for user ${userId}`, 'updateAccountStatus')

    try {
      // Verify that the user has access to the account
      const userAccountLink = await this.accountAccessService.validateUserAccountAccess(userId, accountId, 'updateAccountStatus')

      // Check if the account is already in the desired state
      if (userAccountLink.account.isActive === isActive) {
        this.logger.debug(`Account ${accountId} is already ${isActive ? 'active' : 'inactive'}`, 'updateAccountStatus')
        return {
          id: userAccountLink.account.id,
          name: userAccountLink.account.name,
          isActive: userAccountLink.account.isActive
        }
      }

      // Update the account status
      const updatedAccount = await this.prisma.account.update({
        where: { id: accountId },
        data: { isActive }
      })

      return {
        id: updatedAccount.id,
        name: updatedAccount.name,
        isActive: updatedAccount.isActive
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to update account ${accountId} status to ${isActive ? 'active' : 'inactive'} for user ${userId}: ${error.message}`, 'updateAccountStatus')
      throw new BadRequestException(`Failed to ${isActive ? 'activate' : 'deactivate'} account`)
    }
  }

  public async updateAccountUsers(userId: string, accountId: string, userIds: string[]): Promise<UpdateAccountUsersResponseDto> {
    this.logger.debug(`Managing users for account ${accountId}`, 'updateAccountUsers')

    try {
      // Verify access
      await this.accountAccessService.validateUserAccountAccess(userId, accountId, 'updateAccountUsers')

      // Get account with active users and entities
      const account = await this.prisma.account.findUnique({
        where: { id: accountId },
        include: {
          usersLinked: {
            include: {
              user: {
                include: {
                  people: true
                }
              }
            }
          },
          entities: {
            where: { isActive: true },
            include: {
              users: {
                where: { user: { isActive: true } },
                include: { user: true }
              }
            }
          }
        }
      })

      if (!account) throw new NotFoundException(`Account with ID ${accountId} not found`)

      // Calculate users to add and remove
      const currentUserIds = account.usersLinked.map((link) => link.userId)
      const usersToRemove = currentUserIds.filter((id) => !userIds.includes(id))
      const usersToAdd = userIds.filter((id) => !currentUserIds.includes(id))

      // Check if the account would have no active users after the update
      const remainingDirectUsers = currentUserIds.filter((id) => !usersToRemove.includes(id)).length
      const activeUsersInEntities = new Set()
      account.entities.forEach((entity) => {
        entity.users.forEach((userLink) => {
          activeUsersInEntities.add(userLink.user.id)
        })
      })

      if (remainingDirectUsers === 0 && activeUsersInEntities.size === 0) {
        throw new BadRequestException('Cannot update users as it would leave the account without any active users (directly or via active entities)')
      }

      // Update users
      await this.prisma.$transaction(async (prisma) => {
        // Remove users
        if (usersToRemove.length > 0) {
          await prisma.userAccountLink.deleteMany({
            where: {
              userId: { in: usersToRemove },
              accountId
            }
          })
        }

        // Add users
        if (usersToAdd.length > 0) {
          await prisma.userAccountLink.createMany({
            data: usersToAdd.map((userId) => ({
              userId,
              accountId
            }))
          })
        }
      })

      // Get updated users list
      const updatedUsers = await this.prisma.userAccountLink.findMany({
        where: { accountId },
        include: {
          user: {
            include: {
              people: true
            }
          }
        }
      })

      // Process users data
      const users = updatedUsers.map((link) => ({
        id: link.user.id,
        email: link.user.email,
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
        id: account.id,
        name: account.name,
        users
      }
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException || error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to manage users for account ${accountId}: ${error.message}`, 'manageAccountUsers')
      throw new BadRequestException('Failed to update account users')
    }
  }

  public async fetchAccountUsers(userId: string, accountId: string, filters: FetchAccountUsersDto): Promise<FetchAccountUsersResponseDto> {
    this.logger.debug(`Fetching users for account ${accountId} with filters ${JSON.stringify(filters)}`, 'fetchAccountUsers')

    try {
      // Verify that the user has access to the account
      await this.accountAccessService.validateUserAccountAccess(userId, accountId, 'fetchAccountUsers')

      // Build base query for filtering
      const accessConditions: Prisma.UserWhereInput[] = []

      // Include directly linked users if requested
      if (filters.includeDirectUsers !== false) {
        accessConditions.push({
          accountsLinked: {
            some: {
              accountId
            }
          }
        })
      }

      // Include users from entities
      accessConditions.push({
        entitiesLinked: {
          some: {
            entity: {
              accountId
            }
          }
        }
      })

      // Build search conditions if provided
      let searchConditions: Prisma.UserWhereInput | undefined
      if (filters.search) {
        const searchTerm = filters.search
        this.logger.debug(`Search term: ${searchTerm}`, 'fetchAccountUsers')
        searchConditions = {
          OR: [
            {
              email: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            },
            {
              people: {
                OR: [
                  {
                    firstname: {
                      contains: searchTerm,
                      mode: 'insensitive'
                    }
                  },
                  {
                    lastname: {
                      contains: searchTerm,
                      mode: 'insensitive'
                    }
                  }
                ]
              }
            }
          ]
        }
        this.logger.debug(`Search conditions: ${JSON.stringify(searchConditions)}`, 'fetchAccountUsers')
      }

      // Build entity filter as a separate AND condition so it applies to all users (direct + entity-linked)
      let entityFilterCondition: Prisma.UserWhereInput | undefined
      if (filters.entityIds && filters.entityIds.length > 0) {
        entityFilterCondition = {
          entitiesLinked: {
            some: {
              entity: {
                accountId,
                id: {
                  in: filters.entityIds
                }
              }
            }
          }
        }
      }

      // Combine all conditions
      const baseWhereClause: Prisma.UserWhereInput = {
        AND: [{ OR: accessConditions }, ...(searchConditions ? [searchConditions] : []), ...(entityFilterCondition ? [entityFilterCondition] : [])]
      }

      this.logger.debug(`Final query: ${JSON.stringify(baseWhereClause)}`, 'fetchAccountUsers')

      // Apply role filter if provided
      if (filters.roleIds && filters.roleIds.length > 0) {
        baseWhereClause.rolesLinked = {
          some: {
            role: {
              id: {
                in: filters.roleIds
              }
            }
          }
        }
      }

      // Apply active status filter if provided
      if (filters.isActive !== undefined) {
        baseWhereClause.isActive = filters.isActive
      }

      // Get users and count in parallel
      const [users, total] = await this.prisma.$transaction([
        this.prisma.user.findMany({
          where: baseWhereClause,
          include: {
            people: true,
            rolesLinked: {
              include: {
                role: true
              }
            },
            entitiesLinked: {
              include: {
                entity: {
                  include: {
                    organization: true
                  }
                }
              }
            },
            accountsLinked: {
              where: {
                accountId
              }
            }
          },
          orderBy: this.getUserOrderBy(filters.orderBy),
          skip: this.paginationService.getOffset(filters),
          take: filters.limit
        }),
        this.prisma.user.count({
          where: baseWhereClause
        })
      ])

      // Process users data
      const userData = users.map((user) => {
        const userEntities = user.entitiesLinked
          .filter((entityLink) => entityLink.entity && entityLink.entity.accountId === accountId)
          .map((entityLink) => ({
            id: entityLink.entity.id,
            name: entityLink.entity.name,
            organization: entityLink.entity.organization
              ? {
                  id: entityLink.entity.organization.id,
                  name: entityLink.entity.organization.name
                }
              : null
          }))

        return {
          id: user.id,
          email: user.email,
          isActive: user.isActive,
          people: user.people
            ? {
                id: user.people.id,
                firstname: user.people.firstname,
                lastname: user.people.lastname
              }
            : null,
          roles: user.rolesLinked.map((roleLink) => ({
            id: roleLink.role.id,
            name: roleLink.role.name
          })),
          entities: userEntities,
          isDirectlyLinked: user.accountsLinked.length > 0,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      })

      return this.paginationService.createPaginatedResponse(userData, filters, total)
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to fetch users for account ${accountId}: ${error.message}`, 'fetchAccountUsers')
      throw new BadRequestException('Failed to fetch account users')
    }
  }

  public async fetchAccountEntities(userId: string, accountId: string, dto: FetchAccountEntitiesDto): Promise<FetchAccountEntitiesResponseDto> {
    this.logger.debug(`Fetching entities for account ${accountId} with filters`, 'fetchAccountEntities')

    try {
      // Verify that the user has access to the account
      await this.accountAccessService.validateUserAccountAccess(userId, accountId, 'fetchAccountEntities')

      // Build where clause for filtering
      const whereClause: Prisma.EntityWhereInput = {
        accountId
      }

      // Apply active status filter if provided
      if (dto.isActive !== undefined) {
        whereClause.isActive = dto.isActive
      }

      // Apply user filter if provided
      if (dto.userIds && dto.userIds.length > 0) {
        whereClause.users = {
          some: {
            userId: {
              in: dto.userIds
            }
          }
        }

        // Apply inactive users filter if requested
        if (dto.includeInactiveUsers !== true) {
          whereClause.users = {
            some: {
              user: {
                isActive: true,
                id: {
                  in: dto.userIds
                }
              }
            }
          }
        }
      }

      // Apply text search filter if provided
      if (dto.search) {
        const searchTerm = dto.search
        whereClause.OR = [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            description: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            organization: {
              name: {
                contains: searchTerm,
                mode: 'insensitive'
              }
            }
          }
        ]
      }

      // Get entities and count in parallel
      const [entities, total] = await this.prisma.$transaction([
        this.prisma.entity.findMany({
          where: whereClause,
          include: {
            organization: true
          },
          orderBy: this.getEntityOrderBy(dto.orderBy),
          skip: this.paginationService.getOffset(dto),
          take: dto.limit
        }),
        this.prisma.entity.count({
          where: whereClause
        })
      ])

      // Process entities data
      const entitiesData = entities.map((entity) => ({
        id: entity.id,
        name: entity.name,
        description: entity.description,
        isActive: entity.isActive,
        organization: entity.organization
          ? {
              id: entity.organization.id,
              name: entity.organization.name
            }
          : null,
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt
      }))

      return this.paginationService.createPaginatedResponse(entitiesData, dto, total)
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to fetch entities for account ${accountId}: ${error.message}`, 'fetchAccountEntities')
      throw new BadRequestException('Failed to fetch account entities')
    }
  }

  public async fetchAccountRoles(userId: string, accountId: string, dto: FetchAccountRolesDto): Promise<FetchAccountRolesResponseDto> {
    this.logger.debug(`Fetching roles for account ${accountId} with filters`, 'fetchAccountRoles')

    try {
      // Verify that the user has access to the account
      await this.accountAccessService.validateUserAccountAccess(userId, accountId, 'fetchAccountRoles')

      // Build where clause for filtering
      const whereClause: Prisma.RoleWhereInput = {
        OR: [{ accountId }, { accountId: null }]
      }

      // Apply active status filter if provided
      if (dto.isActive !== undefined) {
        whereClause.isActive = dto.isActive
      }

      // Apply text search filter if provided
      if (dto.search) {
        const searchTerm = dto.search
        whereClause.AND = [
          {
            name: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      }

      // Get roles and count in parallel
      const [roles, total] = await this.prisma.$transaction([
        this.prisma.role.findMany({
          where: whereClause,
          orderBy: this.getRoleOrderBy(dto.orderBy),
          skip: this.paginationService.getOffset(dto),
          take: dto.limit
        }),
        this.prisma.role.count({
          where: whereClause
        })
      ])

      // Process roles data
      const rolesData = roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        isActive: role.isActive,
        isGlobal: role.accountId === null,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt
      }))

      return this.paginationService.createPaginatedResponse(rolesData, dto, total)
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) throw error
      this.logger.error(`Failed to fetch roles for account ${accountId}: ${error.message}`, 'fetchAccountRoles')
      throw new BadRequestException('Failed to fetch account roles')
    }
  }

  /**
   * Privates methods
   */
  private getUserOrderBy(orderBy?: UserOrderBy): Prisma.UserOrderByWithRelationInput {
    switch (orderBy) {
      case UserOrderBy.NAME:
        return { people: { firstname: 'asc' } }
      case UserOrderBy.LASTNAME:
        return { people: { lastname: 'asc' } }
      case UserOrderBy.UPDATED_AT:
        return { updatedAt: 'desc' }
      case UserOrderBy.CREATED_AT:
      default:
        return { createdAt: 'desc' }
    }
  }

  private getEntityOrderBy(orderBy?: EntityOrderBy): Prisma.EntityOrderByWithRelationInput {
    switch (orderBy) {
      case EntityOrderBy.NAME:
        return { name: 'asc' }
      case EntityOrderBy.ORGANIZATION_NAME:
        return { organization: { name: 'asc' } }
      case EntityOrderBy.UPDATED_AT:
        return { updatedAt: 'desc' }
      case EntityOrderBy.CREATED_AT:
      default:
        return { createdAt: 'desc' }
    }
  }

  private getRoleOrderBy(orderBy?: RoleOrderBy): Prisma.RoleOrderByWithRelationInput {
    switch (orderBy) {
      case RoleOrderBy.NAME:
        return { name: 'asc' }
      case RoleOrderBy.CREATED_AT:
      default:
        return { createdAt: 'desc' }
    }
  }
}
