/**
 * Utility for setting up test invitation data for E2E tests
 */
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { Locale, TokenType } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'

/**
 * Invitation test data configuration
 */
export interface InvitationTestConfig {
  /** Email address of the invited user */
  email: string
  /** First name of the invited user */
  firstname?: string
  /** Last name of the invited user */
  lastname?: string
  /** Role IDs to assign to the invited user */
  roleIds?: number[]
  /** Account IDs to link the invited user to */
  accountIds?: string[]
  /** Entity IDs to link the invited user to */
  entityIds?: string[]
  /** Preferred locale for the invited user */
  locale?: Locale
  /** Inviter user ID */
  inviterId: string
  /** JWT secret for invitation tokens (defaults to test secret) */
  jwtSecret?: string
  /** JWT expiration time for invitation tokens (defaults to 1d) */
  jwtExpiresIn?: string
}

/**
 * Invitation test data result
 */
export interface InvitationTestData {
  /** Invitation token */
  token: string
  /** User ID of the invited user */
  userId: string
  /** Email of the invited user */
  email: string
  /** Token record ID */
  tokenId: string
}

/**
 * Set up a test invitation
 * @param prisma The Prisma service
 * @param config The invitation configuration
 * @returns The created invitation data
 */
export async function setupTestInvitation(prisma: PrismaService, config: InvitationTestConfig): Promise<InvitationTestData> {
  const { email, firstname, lastname, roleIds, accountIds, entityIds, locale, jwtSecret = 'test-invitation-secret', jwtExpiresIn = '1d' } = config

  // Create or find a user for the invitation
  let user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    // Create inactive user
    user = await prisma.user.create({
      data: {
        email,
        password: '', // Will be set when invitation is accepted
        isActive: false
      }
    })
  }

  // Create the invitation token
  const payload = {
    email: user.email,
    sub: user.id,
    firstname,
    lastname,
    roleIds,
    accountIds,
    entityIds,
    locale
  }

  const token = jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiresIn })

  // Store the token in the database
  const tokenRecord = await prisma.userToken.create({
    data: {
      userId: user.id,
      token,
      type: TokenType.INVITATION,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now
    }
  })

  return {
    token,
    userId: user.id,
    email: user.email,
    tokenId: tokenRecord.id
  }
}

/**
 * Accept a test invitation
 * @param prisma The Prisma service
 * @param userId The user ID of the invited user
 * @param password The password to set for the user
 * @param firstname The first name to set for the user
 * @param lastname The last name to set for the user
 * @returns The updated user data
 */
export async function acceptTestInvitation(prisma: PrismaService, userId: string, password: string, firstname?: string, lastname?: string): Promise<{ userId: string }> {
  // Hash the password
  const hashedPassword = await bcrypt.hash(password, 10)

  // Check if the user already has a profile
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { people: true }
  })

  // Update the user based on whether they have a profile or not
  if (existingUser?.people) {
    // Update the existing user
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        isActive: true,
        people: {
          update: {
            firstname: firstname || existingUser.people.firstname || 'Test',
            lastname: lastname || existingUser.people.lastname || 'User'
          }
        }
      }
    })
  } else {
    // Create a new profile for the user
    await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        isActive: true,
        people: {
          create: {
            firstname: firstname || 'Test',
            lastname: lastname || 'User'
          }
        }
      }
    })
  }

  return {
    userId
  }
}

/**
 * Clean up a test invitation
 * @param prisma The Prisma service
 * @param userId The user ID of the invited user
 */
export async function cleanupTestInvitation(prisma: PrismaService, userId: string): Promise<void> {
  // Delete tokens
  await prisma.userToken.deleteMany({
    where: { userId }
  })

  // Delete user
  await prisma.user
    .delete({
      where: { id: userId }
    })
    .catch(() => {
      // Ignore if user doesn't exist or is referenced
    })
}

/**
 * Create an invitation DTO for API requests
 * @param email The email address to invite
 * @param accountIds The account IDs to link to
 * @param entityIds The entity IDs to link to
 * @returns Invitation creation DTO
 */
export function createInvitationDto(
  email: string,
  accountIds: string[] = [],
  entityIds: string[] = []
): {
  email: string
  firstname: string
  lastname: string
  roleIds: number[]
  accountIds: string[]
  entityIds: string[]
  locale: Locale
} {
  return {
    email,
    firstname: 'Test',
    lastname: 'Invitee',
    roleIds: [1], // Adjust as needed
    accountIds,
    entityIds,
    locale: Locale.FR
  }
}

/**
 * Create an accept invitation DTO for API requests
 * @param token The invitation token
 * @param password The password to set
 * @returns Accept invitation DTO
 */
export function createAcceptInvitationDto(
  token: string,
  password: string = 'TestPassword123'
): {
  invitationToken: string
  password: string
  firstname: string
  lastname: string
  locale: Locale
} {
  return {
    invitationToken: token,
    password,
    firstname: 'Accepted',
    lastname: 'User',
    locale: Locale.FR
  }
}
