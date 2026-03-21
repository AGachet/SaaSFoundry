/**
 * Utility for setting up test users with specific roles for E2E tests
 */
import { PrismaService } from '@configs/prisma/services/prisma.service'
import * as bcrypt from 'bcrypt'
import request from 'supertest'

/**
 * Configuration for a test user
 */
export interface TestUserConfig {
  /** Email of the test user */
  email: string
  /** Password of the test user */
  password: string
  /** First name of the test user */
  firstname: string
  /** Last name of the test user */
  lastname: string
  /** Roles to assign to the user */
  roles: string[]
  /** Permissions to ensure the user has */
  permissions?: string[]
}

/**
 * Test user result
 */
export interface TestUser {
  /** User ID */
  id: string
  /** User email */
  email: string
  /** Account ID associated with the user */
  accountId: string
}

/**
 * Create a test user with specific roles and permissions
 * @param prisma The Prisma service
 * @param config The user configuration
 * @returns The created user data
 */
export async function setupTestUser(prisma: PrismaService, config: TestUserConfig): Promise<TestUser> {
  // Normalize email to lowercase (matches real app behavior where DTOs transform emails to lowercase)
  config.email = config.email.toLowerCase()

  // Check if the user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: config.email },
    include: {
      accountsLinked: {
        include: {
          account: true
        }
      }
    }
  })

  if (existingUser) {
    return {
      id: existingUser.id,
      email: existingUser.email,
      accountId: existingUser.accountsLinked[0]?.accountId || ''
    }
  }

  // Find required roles
  const rolePromises = config.roles.map((roleName) => prisma.role.findFirst({ where: { name: roleName } }))

  const roles = await Promise.all(rolePromises)

  // Verify all roles were found
  if (roles.some((role) => !role)) {
    const missingRoles = config.roles.filter((role, index) => !roles[index])
    throw new Error(`Required roles not found: ${missingRoles.join(', ')}`)
  }

  // Create People record
  const people = await prisma.people.create({
    data: {
      firstname: config.firstname,
      lastname: config.lastname,
      email: config.email
    }
  })

  // Hash password
  const hashedPassword = await bcrypt.hash(config.password, 10)

  // Create user with roles
  const user = await prisma.user.create({
    data: {
      email: config.email,
      password: hashedPassword,
      isActive: true,
      peopleId: people.id,
      preference: {
        create: {
          locale: 'FR'
        }
      },
      rolesLinked: {
        create: roles.filter(Boolean).map((role) => ({
          roleId: role!.id
        }))
      }
    }
  })

  // Create account for the user
  const account = await prisma.account.create({
    data: {
      name: `Test Account for ${config.firstname} ${config.lastname}`,
      description: 'Test account created for E2E testing',
      isActive: true,
      usersLinked: {
        create: {
          userId: user.id
        }
      }
    }
  })

  // If permissions are specified, ensure the roles have those permissions
  if (config.permissions?.length) {
    await ensureRolesHavePermissions(prisma, roles.filter(Boolean) as Array<{ id: number }>, config.permissions)
  }

  return {
    id: user.id,
    email: user.email,
    accountId: account.id
  }
}

/**
 * Ensure that roles have the required permissions
 * @param prisma The Prisma service
 * @param roles The roles to check and update
 * @param requiredPermissions The permissions that need to be assigned
 */
async function ensureRolesHavePermissions(prisma: PrismaService, roles: { id: number }[], requiredPermissions: string[]): Promise<void> {
  // Get role permissions
  const rolesWithPermissions = await Promise.all(
    roles.map((role) =>
      prisma.role.findUnique({
        where: { id: role.id },
        include: {
          permissionsLinked: {
            include: {
              permission: true
            }
          }
        }
      })
    )
  )

  // For each role, check if it has the required permissions
  for (const role of rolesWithPermissions) {
    if (!role) continue

    // Check if role has each required permission
    for (const permName of requiredPermissions) {
      const hasPermission = role.permissionsLinked.some((link) => link.permission.name === permName)

      if (!hasPermission) {
        // Find or create the permission
        const module = await findModuleForPermission(prisma, permName)

        if (!module) {
          console.warn(`Could not find appropriate module for permission: ${permName}`)
          continue
        }

        // Find or create the permission
        const permission =
          (await prisma.modulePermission.findFirst({
            where: { name: permName }
          })) ||
          (await prisma.modulePermission.create({
            data: {
              name: permName,
              description: `Auto-created permission: ${permName}`,
              moduleId: module.id
            }
          }))

        // Link permission to role
        await prisma.rolePermissionLink.create({
          data: {
            roleId: role.id,
            permissionId: permission.id
          }
        })
      }
    }
  }
}

/**
 * Find appropriate module for a permission based on naming convention
 * @param prisma The Prisma service
 * @param permissionName The permission name
 * @returns The found module or null
 */
async function findModuleForPermission(prisma: PrismaService, permissionName: string): Promise<{ id: number } | null> {
  // Try to derive module name from permission name (e.g. ORGANIZATION_CREATION -> ORGANIZATION_ADMINISTRATION)
  const parts = permissionName.split('_')
  if (parts.length > 0) {
    const entity = parts[0]
    const moduleName = `${entity}_ADMINISTRATION`

    const module = await prisma.module.findFirst({
      where: { name: moduleName }
    })

    if (module) return module
  }

  // Fallback to ACCOUNT_ADMINISTRATION
  return prisma.module.findFirst({
    where: { name: 'ACCOUNT_ADMINISTRATION' }
  })
}

/**
 * Login as a test user
 * @param agent The supertest agent
 * @param email User email
 * @param password User password
 * @param baseUrl Base URL for API
 * @returns true if login was successful
 */
export async function loginTestUser(agent: ReturnType<typeof request.agent>, email: string, password: string, baseUrl: string = '/api'): Promise<boolean> {
  try {
    const response = await agent.post(`${baseUrl}/auth/signin`).send({
      email,
      password
    })

    return response.status === 200
  } catch (error) {
    console.error('Error during login:', error)
    return false
  }
}

/**
 * Clean up test user data
 * @param prisma The Prisma service
 * @param email User email to clean up
 */
export async function cleanupTestUser(prisma: PrismaService, email: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      accountsLinked: true
    }
  })

  if (user) {
    // Delete the user (should cascade delete most relationships)
    await prisma.user.delete({
      where: { id: user.id }
    })

    // Clean up account if it exists and no other users are linked
    for (const link of user.accountsLinked) {
      const otherUsers = await prisma.userAccountLink.findMany({
        where: {
          accountId: link.accountId,
          userId: { not: user.id }
        }
      })

      if (otherUsers.length === 0) {
        await prisma.account.delete({
          where: { id: link.accountId }
        })
      }
    }
  }
}
