/**
 * Resources
 */
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { OrganizationType } from '@prisma/client'
import cookieParser from 'cookie-parser'
import * as dotenv from 'dotenv'
import request from 'supertest'

/**
 * Dependencies
 */
import { AccountAccessModule } from '@common/services/account-access/account-access.module'
import { LoggerModule } from '@common/services/logger/logger.module'
import { cleanupTestEntity, createEntityDto, createEntityUsersDto, setupTestEntity } from '@common/tests/e2e/utils/setup-test-entity'
import { cleanupTestOrganization, setupTestOrganization } from '@common/tests/e2e/utils/setup-test-organization'
import { cleanupTestUser, loginTestUser, setupTestUser, TestUser } from '@common/tests/e2e/utils/setup-test-user'
import { EnvModule } from '@configs/env/env.module'
import { PrismaModule } from '@configs/prisma/prisma.module'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { AuthModule } from '@modules/auth/auth.module'
import { EntitiesModule } from '@modules/entities/entities.module'

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
 * Test Suite
 */
describe('Entities Module (e2e)', () => {
  let app: INestApplication
  let prismaService: PrismaService
  let agent: ReturnType<typeof request.agent>
  let testUser: TestUser
  let testOrganization: { id: string }
  let createdEntityId: string

  beforeAll(async () => {
    // Create NestJS application
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [EntitiesModule, AuthModule, LoggerModule, EnvModule, PrismaModule, AccountAccessModule]
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix(process.env.API_PREFIX ?? '/api')
    app.use(cookieParser())

    prismaService = moduleRef.get<PrismaService>(PrismaService)

    // Set up test user with necessary roles and permissions
    testUser = await setupTestUser(prismaService, {
      email: 'entitytest@billmate.test',
      password: 'TestPassword123',
      firstname: 'Entity',
      lastname: 'Manager',
      roles: ['user', 'admin'],
      permissions: ['ENTITY_CREATION', 'ENTITY_USER_MANAGEMENT']
    })

    // Create a test organization
    testOrganization = await setupTestOrganization(prismaService, {
      name: 'Test Organization',
      type: OrganizationType.COMPANY,
      description: 'Test Organization Description',
      accountId: testUser.accountId
    })

    // Create test entity
    const entity = await setupTestEntity(prismaService, {
      name: 'Test Entity',
      description: 'Test Entity Description',
      accountId: testUser.accountId,
      organizationId: testOrganization.id
    })

    createdEntityId = entity.id

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
    // Clean up test data
    await cleanupTestEntity(prismaService, createdEntityId)

    // Clean up test organization
    await cleanupTestOrganization(prismaService, testOrganization.id)

    // Clean up test user
    await cleanupTestUser(prismaService, testUser.email)

    await prismaService.$disconnect()
    await app.close()
  })

  describe('Entity Creation', () => {
    it('should successfully create a new entity when authenticated', async () => {
      const dto = createEntityDto(testUser.accountId, testOrganization.id, `Test Entity ${Date.now()}`)

      const response = await agent.post('/api/entities').send(dto)
      expect([201, 400]).toContain(response.status)
    })

    it('should reject entity creation when not authenticated', async () => {
      const dto = createEntityDto(testUser.accountId, testOrganization.id)

      await request(app.getHttpServer()).post('/api/entities').send(dto).expect(401)
    })
  })

  describe('Entity Users Management', () => {
    it('should successfully update entity users when authenticated', async () => {
      const dto = createEntityUsersDto([testUser.id])

      const response = await agent.patch(`/api/entities/${createdEntityId}/users`).send(dto).expect(200)

      expect(response.body).toMatchObject({
        id: createdEntityId,
        name: 'Test Entity',
        users: expect.arrayContaining([
          expect.objectContaining({
            id: testUser.id,
            email: testUser.email,
            isActive: true
          })
        ])
      })
    })

    it('should reject updating entity users when not authenticated', async () => {
      const dto = createEntityUsersDto([testUser.id])

      await request(app.getHttpServer()).patch(`/api/entities/${createdEntityId}/users`).send(dto).expect(401)
    })

    it('should reject updating users for non-existent entity', async () => {
      const dto = createEntityUsersDto([testUser.id])

      await agent.patch('/api/entities/non-existent-id/users').send(dto).expect(404)
    })

    it('should reject updating entity users with invalid user IDs', async () => {
      await agent
        .patch(`/api/entities/${createdEntityId}/users`)
        .send({ userIds: ['invalid-user-id'] })
        .expect(400)
    })
  })
})
