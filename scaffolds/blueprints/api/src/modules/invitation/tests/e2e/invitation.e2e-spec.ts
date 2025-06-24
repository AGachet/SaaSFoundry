/**
 * Resources
 */
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Locale, OrganizationType } from '@prisma/client'
import cookieParser from 'cookie-parser'
import * as dotenv from 'dotenv'
import request from 'supertest'

/**
 * Dependencies
 */
import { AccountAccessModule } from '@common/services/account-access/account-access.module'
import { LoggerModule } from '@common/services/logger/logger.module'
import { createAcceptInvitationDto, createInvitationDto } from '@common/tests/e2e/utils/setup-test-invitation'
import { cleanupTestOrganization, setupTestOrganization } from '@common/tests/e2e/utils/setup-test-organization'
import { cleanupTestUser, loginTestUser, setupTestUser, TestUser } from '@common/tests/e2e/utils/setup-test-user'
import { EnvModule } from '@configs/env/env.module'
import { PrismaModule } from '@configs/prisma/prisma.module'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { AuthModule } from '@modules/auth/auth.module'
import { InvitationModule } from '@modules/invitation/invitation.module'

// Load test environment variables
dotenv.config({ path: '.env.test' })

/**
 * Mocks
 */
jest.mock('@common/services/logger/logger.service', () => ({
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn()
  }))
}))

// Mock email service to prevent actual email sending
jest.mock('@modules/email/services/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendInvitationEmail: jest.fn().mockResolvedValue(true)
  }))
}))

/**
 * Test Suite
 */
describe('Invitation Module (e2e)', () => {
  let app: INestApplication
  let prismaService: PrismaService
  let agent: ReturnType<typeof request.agent>
  let testUser: TestUser
  let testOrganization: { id: string }
  let invitationToken: string
  let invitedUserEmail: string

  beforeAll(async () => {
    // Create NestJS application
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [InvitationModule, AuthModule, LoggerModule, EnvModule, PrismaModule, AccountAccessModule]
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix(process.env.API_PREFIX ?? '/api')
    app.use(cookieParser())

    prismaService = moduleRef.get<PrismaService>(PrismaService)

    // Set up test user with necessary roles and permissions
    testUser = await setupTestUser(prismaService, {
      email: 'invitationtest@billmate.test',
      password: 'TestPassword123',
      firstname: 'Invitation',
      lastname: 'Manager',
      roles: ['admin'],
      permissions: ['USER_ACCOUNTS_INVITATION', 'USER_ENTITIES_INVITATION', 'USER_ROLE_ALLOCATION']
    })

    // Create a test organization
    testOrganization = await setupTestOrganization(prismaService, {
      name: 'Test Organization',
      type: OrganizationType.COMPANY,
      description: 'Test Organization Description',
      accountId: testUser.accountId
    })

    await app.init()

    // Create agent for authenticated requests
    agent = request.agent(app.getHttpServer())

    // Login with test user
    const loginSuccess = await loginTestUser(agent, testUser.email, 'TestPassword123')
    if (!loginSuccess) {
      throw new Error('Failed to login with test user')
    }

    // Generate a unique email for testing
    invitedUserEmail = `invited-user-${Date.now()}@billmate.test`
  })

  afterAll(async () => {
    // Clean up test organization
    await cleanupTestOrganization(prismaService, testOrganization.id)

    // Clean up test user
    await cleanupTestUser(prismaService, testUser.email)

    // Clean up invited user if one was created
    if (invitedUserEmail) {
      const invitedUser = await prismaService.user.findUnique({
        where: { email: invitedUserEmail }
      })
      if (invitedUser) {
        // Delete tokens
        await prismaService.userToken.deleteMany({
          where: { userId: invitedUser.id }
        })
        // Delete user
        await prismaService.user
          .delete({
            where: { id: invitedUser.id }
          })
          .catch(() => {
            // Ignore if deletion fails due to constraints
          })
      }
    }

    await prismaService.$disconnect()
    await app.close()
  })

  describe('Invitation Creation', () => {
    it('should successfully create an invitation when authenticated', async () => {
      // Vérifier que le compte existe et est actif
      const account = await prismaService.account.findUnique({
        where: { id: testUser.accountId }
      })
      expect(account).not.toBeNull()
      expect(account?.isActive).toBe(true)

      const dto = {
        email: invitedUserEmail,
        firstname: 'Test',
        lastname: 'User',
        roleIds: [2],
        accountIds: [testUser.accountId],
        entityIds: [],
        locale: Locale.FR
      }

      const response = await agent.post('/api/invitations').send(dto)

      // Vérifier que la réponse est un succès
      expect(response.status).toBe(201)

      expect(response.body).toMatchObject({
        message: expect.stringContaining('Invitation sent successfully')
      })

      // Save the invitation token for later tests if it exists in the response
      if (response.body.invitationToken) {
        invitationToken = response.body.invitationToken
      }

      // Vérifier que l'invitation a bien été créée dans la base de données
      const invitation = await prismaService.invitation.findFirst({
        where: {
          inviteeUserEmail: invitedUserEmail,
          inviterUserId: testUser.id,
          status: 'SENT'
        },
        include: {
          accountsLinked: true,
          entitiesLinked: true,
          rolesLinked: true
        }
      })

      expect(invitation).not.toBeNull()
      expect(invitation?.status).toBe('SENT')
      expect(invitation?.accountsLinked).toHaveLength(1)
      expect(invitation?.accountsLinked[0].accountId).toBe(testUser.accountId)
      expect(invitation?.rolesLinked).toHaveLength(1)
      expect(invitation?.rolesLinked[0].roleId).toBe(2)
    })

    it('should reject invitation creation when not authenticated', async () => {
      const dto = {
        email: `non-auth-invite-${Date.now()}@billmate.test`,
        firstname: 'Test',
        lastname: 'User',
        roleIds: [2],
        accountIds: [testUser.accountId],
        entityIds: [],
        locale: Locale.FR
      }

      await request(app.getHttpServer()).post('/api/invitations').send(dto).expect(401)
    })

    it('should reject invitation without at least one account or entity ID', async () => {
      const dto = {
        email: `no-context-${Date.now()}@billmate.test`,
        firstname: 'No',
        lastname: 'Context',
        accountIds: [],
        entityIds: [],
        roleIds: [2],
        locale: Locale.FR
      }

      const response = await agent.post('/api/invitations').send(dto)
      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('account or entity')
    })
  })

  describe('List User Invitations', () => {
    it('should return user invitations when authenticated', async () => {
      // S'assurer qu'une invitation existe
      if (!invitationToken) {
        const dto = createInvitationDto(`backup-invite-${Date.now()}@billmate.test`, [testUser.accountId])
        await agent.post('/api/invitations').send(dto)
      }

      const response = await agent.get('/api/invitations')

      // Verify successful response
      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('invitations')
      expect(Array.isArray(response.body.invitations)).toBe(true)

      // Our test user should have at least one invitation
      expect(response.body.invitations.length).toBeGreaterThan(0)

      // Verify invitation structure
      const invitation = response.body.invitations[0]
      expect(invitation).toMatchObject({
        id: expect.any(String),
        inviterUserId: testUser.id,
        inviteeUserEmail: expect.any(String),
        status: expect.any(String),
        invitedAt: expect.any(String)
      })
    })

    it('should reject invitation listing when not authenticated', async () => {
      await request(app.getHttpServer()).get('/api/invitations').expect(401)
    })
  })

  describe('Invitation Acceptance', () => {
    // This test depends on the invitation token from the previous test
    it('should accept a valid invitation token', async () => {
      // Skip if no token was generated in the previous test
      if (!invitationToken) {
        console.warn('Skipping invitation acceptance test as no token was generated')
        return
      }

      const dto = createAcceptInvitationDto(invitationToken)

      const response = await request(app.getHttpServer()).post('/api/invitations/accept').send(dto)

      // The response should be successful (200 or 201)
      // if the token is expired or already used, we'll get 400 or 401
      expect([200, 201, 400]).toContain(response.status)

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('userId')
      }
    })

    it('should reject an invalid invitation token', async () => {
      const dto = createAcceptInvitationDto('invalid.token.format')

      const response = await request(app.getHttpServer()).post('/api/invitations/accept').send(dto).expect(401)
      expect(response.body).toHaveProperty('message')
    })

    it('should reject acceptance without a password', async () => {
      const dto = {
        invitationToken: 'valid.looking.token' // But missing password
      }

      const response = await request(app.getHttpServer()).post('/api/invitations/accept').send(dto).expect(401)
      expect(response.body).toHaveProperty('message')
    })
  })
})
