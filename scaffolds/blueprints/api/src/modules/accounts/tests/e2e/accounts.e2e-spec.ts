/**
 * Resources
 */
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import * as dotenv from 'dotenv'
import request from 'supertest'

/**
 * Dependencies
 */
import { AccountAccessModule } from '@common/services/account-access/account-access.module'
import { LoggerModule } from '@common/services/logger/logger.module'
import { cleanupTestUser, loginTestUser, setupTestUser, TestUser } from '@common/tests/e2e/utils/setup-test-user'
import { EnvModule } from '@configs/env/env.module'
import { PrismaModule } from '@configs/prisma/prisma.module'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { AccountsModule } from '@modules/accounts/accounts.module'
import { AuthModule } from '@modules/auth/auth.module'

/**
 * Note: Using common test utilities instead of module-specific ones
 */

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

/**
 * Declaration
 */
describe('Accounts Module (e2e)', () => {
  let app: INestApplication
  let prismaService: PrismaService
  let agent: ReturnType<typeof request.agent>
  let testUser: TestUser
  let testUser2: TestUser
  let accountId: string
  let entityId: string

  beforeAll(async () => {
    // Create NestJS application
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AccountsModule, AuthModule, LoggerModule, EnvModule, PrismaModule, AccountAccessModule]
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix(process.env.API_PREFIX ?? '/api')
    app.use(cookieParser())
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))

    prismaService = moduleRef.get<PrismaService>(PrismaService)

    // Set up test user with necessary roles and permissions
    testUser = await setupTestUser(prismaService, {
      email: 'accounttest@SaaSFoundry.test',
      password: 'TestPassword123',
      firstname: 'Account',
      lastname: 'Manager',
      roles: ['user', 'admin']
    })

    // Set up second test user
    testUser2 = await setupTestUser(prismaService, {
      email: 'testuser@SaaSFoundry.test',
      password: 'TestPassword123',
      firstname: 'Test',
      lastname: 'User',
      roles: ['user']
    })

    // Store account ID
    accountId = testUser.accountId

    // Create a test entity for entity tests
    const entity = await prismaService.entity.create({
      data: {
        name: 'Test Entity',
        description: 'Test entity for e2e tests',
        accountId,
        isActive: true
      }
    })
    entityId = entity.id

    // Get a role for role tests (using an existing role)
    await prismaService.role.findFirst({
      where: {
        OR: [{ accountId }, { accountId: null }]
      }
    })

    await app.init()

    // Create agent for authenticated requests
    agent = request.agent(app.getHttpServer())

    // Login with test user
    const loginSuccess = await loginTestUser(agent, testUser.email, 'TestPassword123')
    if (!loginSuccess) {
      throw new Error('Failed to login with test user')
    }
  })

  afterAll(async () => {
    // Clean up test entity
    if (entityId) {
      await prismaService.entity
        .delete({
          where: { id: entityId }
        })
        .catch(() => {
          // Ignore errors if entity was already deleted
        })
    }

    // Clean up test users (also cleans up accounts if no other users are linked)
    await cleanupTestUser(prismaService, testUser.email)
    await cleanupTestUser(prismaService, testUser2.email)

    await prismaService.$disconnect()
    await app.close()
  })

  describe('Account Management', () => {
    it('should toggle account status when authenticated', async () => {
      // Check initial account status
      let account = await prismaService.account.findUnique({
        where: { id: accountId }
      })
      const initialStatus = account?.isActive || false

      // Toggle account status
      const newState = !initialStatus
      const response = await agent.patch(`/api/accounts/${accountId}/status`).send({ isActive: newState }).expect(200)

      // Verify response
      expect(response.body.id).toBe(accountId)
      expect(response.body.isActive).toBe(newState)

      // Verify database update
      account = await prismaService.account.findUnique({
        where: { id: accountId }
      })
      expect(account?.isActive).toBe(newState)
    })

    it('should reject updates without authentication', async () => {
      // Get current account status
      const account = await prismaService.account.findUnique({
        where: { id: accountId }
      })
      const currentStatus = account?.isActive

      // Try to update without authentication (direct request, not using agent)
      await request(app.getHttpServer()).patch(`/api/accounts/${accountId}/status`).send({ isActive: !currentStatus }).expect(401)

      // Verify account was not modified
      const updatedAccount = await prismaService.account.findUnique({
        where: { id: accountId }
      })
      expect(updatedAccount?.isActive).toBe(currentStatus)
    })

    describe('Account Details', () => {
      it('should fetch account details when authenticated', async () => {
        const response = await agent.get(`/api/accounts/${accountId}`).expect(200)

        // First check the basic structure
        expect(response.body).toMatchObject({
          id: accountId,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          users: expect.objectContaining({
            count: expect.any(Number),
            values: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                email: expect.any(String),
                isActive: true,
                people: expect.any(Object)
              })
            ])
          }),
          roles: expect.objectContaining({
            count: expect.any(Number),
            values: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(Number),
                name: expect.any(String),
                isActive: expect.any(Boolean)
              })
            ])
          }),
          entities: expect.objectContaining({
            count: expect.any(Number),
            values: expect.any(Array)
          })
        })

        // Check isActive state separately
        expect(response.body.isActive).toBeDefined()
        expect(typeof response.body.isActive).toBe('boolean')
      })

      it('should reject fetching account details without authentication', async () => {
        await request(app.getHttpServer()).get(`/api/accounts/${accountId}`).expect(401)
      })

      it('should reject fetching non-existent account', async () => {
        await agent.get('/api/accounts/non-existent-id').expect(404)
      })
    })

    describe('Account Users Management', () => {
      it('should update account users when authenticated', async () => {
        // Add second user to account
        const response = await agent
          .patch(`/api/accounts/${accountId}/users`)
          .send({ userIds: [testUser.id, testUser2.id] })
          .expect(200)

        expect(response.body).toEqual(
          expect.objectContaining({
            id: accountId,
            users: expect.arrayContaining([
              expect.objectContaining({
                id: expect.any(String),
                email: expect.any(String),
                isActive: expect.any(Boolean),
                people: expect.any(Object)
              })
            ])
          })
        )

        // Verify database update
        const updatedAccount = await prismaService.account.findUnique({
          where: { id: accountId },
          include: {
            usersLinked: {
              include: {
                user: true
              }
            }
          }
        })

        const updatedUserIds = updatedAccount?.usersLinked.map((link) => link.userId) || []
        expect(updatedUserIds).toContain(testUser.id)
        expect(updatedUserIds).toContain(testUser2.id)
      })

      it('should reject updating account users without authentication', async () => {
        await request(app.getHttpServer())
          .patch(`/api/accounts/${accountId}/users`)
          .send({ userIds: [testUser2.id] })
          .expect(401)
      })

      it('should reject updating non-existent account users', async () => {
        await agent
          .patch('/api/accounts/non-existent-id/users')
          .send({ userIds: [testUser2.id] })
          .expect(404)
      })

      it('should reject updating account users with invalid user IDs', async () => {
        await agent
          .patch(`/api/accounts/${accountId}/users`)
          .send({ userIds: ['invalid-user-id'] })
          .expect(400)
      })
    })

    describe('Account Users Fetch', () => {
      it('should fetch account users with pagination', async () => {
        // Fetch users with pagination
        const response = await agent.get(`/api/accounts/${accountId}/users`).query({ page: 1, limit: 10 }).expect(200)

        expect(response.body).toMatchObject({
          items: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              email: expect.any(String),
              isActive: true,
              people: expect.any(Object)
            })
          ]),
          meta: expect.objectContaining({
            pagination: expect.objectContaining({
              current: 1,
              limit: 10,
              total: expect.any(Number)
            }),
            count: expect.any(Number)
          })
        })
      })

      it('should filter account users by search term', async () => {
        // Get user data from database to use for search
        const user = await prismaService.user.findUnique({
          where: { id: testUser.id },
          include: { people: true }
        })

        const searchTerm = user?.people?.lastname || 'Manager' // Fallback to a value we set in the test user

        const response = await agent.get(`/api/accounts/${accountId}/users?search=${searchTerm}`).expect(200)

        // Verify that the response contains at least one user with matching name
        expect(response.body.items.length).toBeGreaterThan(0)
        const foundUser = response.body.items.find((u) => u.people && u.people.lastname === searchTerm)
        expect(foundUser).toBeDefined()
      })

      it('should reject fetching account users without authentication', async () => {
        await request(app.getHttpServer()).get(`/api/accounts/${accountId}/users`).expect(401)
      })
    })

    describe('Account Entities Fetch', () => {
      it('should fetch account entities with pagination', async () => {
        const response = await agent.get(`/api/accounts/${accountId}/entities`).query({ page: 1, limit: 10 }).expect(200)

        expect(response.body).toMatchObject({
          items: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(String),
              name: expect.any(String),
              isActive: true
            })
          ]),
          meta: expect.objectContaining({
            pagination: expect.objectContaining({
              current: 1,
              limit: 10,
              total: expect.any(Number)
            }),
            count: expect.any(Number)
          })
        })
      })

      it('should filter entities by active status', async () => {
        const response = await agent.get(`/api/accounts/${accountId}/entities`).query({ isActive: true }).expect(200)

        // Verify all returned entities are active
        response.body.items.forEach((entity) => {
          expect(entity.isActive).toBe(true)
        })
      })

      it('should reject fetching account entities without authentication', async () => {
        await request(app.getHttpServer()).get(`/api/accounts/${accountId}/entities`).expect(401)
      })
    })

    describe('Account Roles Fetch', () => {
      it('should fetch account roles with pagination', async () => {
        const response = await agent.get(`/api/accounts/${accountId}/roles`).query({ page: 1, limit: 10 }).expect(200)

        expect(response.body).toMatchObject({
          items: expect.arrayContaining([
            expect.objectContaining({
              id: expect.any(Number),
              name: expect.any(String),
              isActive: true
            })
          ]),
          meta: expect.objectContaining({
            pagination: expect.objectContaining({
              current: 1,
              limit: 10,
              total: expect.any(Number)
            }),
            count: expect.any(Number)
          })
        })
      })

      it('should filter roles by name using search', async () => {
        // First get a role name to search for
        const roleResponse = await agent.get(`/api/accounts/${accountId}/roles`).expect(200)

        if (roleResponse.body.items.length > 0) {
          const roleToSearch = roleResponse.body.items[0]
          const searchTerm = roleToSearch.name.substring(0, 3) // Take first 3 characters for partial match

          const response = await agent.get(`/api/accounts/${accountId}/roles?search=${searchTerm}`).expect(200)

          // Expect at least the role we searched for to be in results
          expect(response.body.items.some((role) => role.id === roleToSearch.id)).toBe(true)
        } else {
          // Skip test if no roles to search
          console.log('Skipping role search test as no roles were found')
        }
      })

      it('should reject fetching account roles without authentication', async () => {
        await request(app.getHttpServer()).get(`/api/accounts/${accountId}/roles`).expect(401)
      })
    })
  })
})
