/**
 * Utility for setting up test entity data for E2E tests
 */
import { PrismaService } from '@configs/prisma/services/prisma.service'

/**
 * Entity test data configuration
 */
export interface EntityTestConfig {
  /** Entity name */
  name: string
  /** Entity description */
  description?: string
  /** Account ID to link the entity to */
  accountId: string
  /** Organization ID to link the entity to (optional) */
  organizationId?: string
  /** Whether the entity is active */
  isActive?: boolean
}

/**
 * Entity test data result
 */
export interface EntityTestData {
  /** Entity ID */
  id: string
  /** Entity name */
  name: string
  /** Entity description */
  description: string | null
  /** Whether the entity is active */
  isActive: boolean
  /** Account ID */
  accountId: string
  /** Organization ID */
  organizationId: string | null
}

/**
 * Set up a test entity
 * @param prisma The Prisma service
 * @param config The entity configuration
 * @returns The created entity data
 */
export async function setupTestEntity(prisma: PrismaService, config: EntityTestConfig): Promise<EntityTestData> {
  // Create the entity
  const entity = await prisma.entity.create({
    data: {
      name: config.name,
      description: config.description || null,
      isActive: config.isActive ?? true,
      accountId: config.accountId,
      organizationId: config.organizationId || null
    }
  })

  return {
    id: entity.id,
    name: entity.name,
    description: entity.description,
    isActive: entity.isActive,
    accountId: entity.accountId,
    organizationId: entity.organizationId
  }
}

/**
 * Clean up a test entity
 * @param prisma The Prisma service
 * @param entityId Entity ID to clean up
 */
export async function cleanupTestEntity(prisma: PrismaService, entityId: string): Promise<void> {
  // Delete the entity (should cascade delete links)
  await prisma.entity.deleteMany({
    where: { id: entityId }
  })
}

/**
 * Create an entity DTO for API requests
 * @param accountId The account ID to link to
 * @param organizationId The organization ID to link to (optional)
 * @param name Custom name (optional)
 * @returns Entity creation DTO
 */
export function createEntityDto(
  accountId: string,
  organizationId?: string,
  name?: string
): {
  name: string
  accountId: string
  organizationId?: string
  description?: string
  isActive?: boolean
} {
  return {
    name: name || `Test Entity ${Date.now()}`,
    accountId,
    organizationId,
    description: 'Entity created for E2E testing'
  }
}

/**
 * Create an entity update users DTO
 * @param userIds The user IDs to assign to the entity
 * @returns Entity update users DTO
 */
export function createEntityUsersDto(userIds: string[]): {
  userIds: string[]
} {
  return {
    userIds
  }
}
