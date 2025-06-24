/**
 * Utility for setting up test organization data for E2E tests
 */
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { OrganizationType } from '@prisma/client'

/**
 * Organization test data configuration
 */
export interface OrganizationTestConfig {
  /** Organization name */
  name: string
  /** Organization type */
  type: OrganizationType
  /** Organization description */
  description?: string
  /** Organization website */
  website?: string
  /** Account ID to link the organization to */
  accountId: string
}

/**
 * Organization test data result
 */
export interface OrganizationTestData {
  /** Organization ID */
  id: string
  /** Organization name */
  name: string
  /** Organization type */
  type: OrganizationType
  /** Organization description */
  description: string | null
  /** Organization website */
  website: string | null
}

/**
 * Set up a test organization
 * @param prisma The Prisma service
 * @param config The organization configuration
 * @returns The created organization data
 */
export async function setupTestOrganization(prisma: PrismaService, config: OrganizationTestConfig): Promise<OrganizationTestData> {
  // Create the organization
  const organization = await prisma.organization.create({
    data: {
      name: config.name,
      type: config.type,
      description: config.description || null,
      website: config.website || null
    }
  })

  // Link the organization to the account
  await prisma.organizationAccountLink.create({
    data: {
      organizationId: organization.id,
      accountId: config.accountId
    }
  })

  return {
    id: organization.id,
    name: organization.name,
    type: organization.type,
    description: organization.description,
    website: organization.website
  }
}

/**
 * Clean up a test organization
 * @param prisma The Prisma service
 * @param organizationId Organization ID to clean up
 */
export async function cleanupTestOrganization(prisma: PrismaService, organizationId: string): Promise<void> {
  // Delete the organization (should cascade delete links)
  await prisma.organization.deleteMany({
    where: { id: organizationId }
  })
}

/**
 * Create a test organization DTO for API requests
 * @param accountId The account ID to link to
 * @param type The organization type
 * @param name Custom name (optional)
 * @returns Organization creation DTO
 */
export function createOrganizationDto(
  accountId: string,
  type: OrganizationType = OrganizationType.COMPANY,
  name?: string
): {
  name: string
  type: OrganizationType
  accountId: string
  description: string
  website: string
} {
  return {
    name: name || `Test Organization ${Date.now()}`,
    type,
    accountId,
    description: 'Organization created for E2E testing',
    website: 'https://test-organization.com'
  }
}

/**
 * Create an organization update DTO for API requests
 * @param updates Custom updates to apply
 * @returns Organization update DTO
 */
export function updateOrganizationDto(
  updates: Partial<{
    name: string
    type: OrganizationType
    description: string
    website: string
  }> = {}
): {
  name?: string
  type?: OrganizationType
  description?: string
  website?: string
} {
  return {
    name: updates.name || `Updated Organization ${Date.now()}`,
    description: updates.description || 'Updated organization description',
    website: updates.website,
    type: updates.type
  }
}
