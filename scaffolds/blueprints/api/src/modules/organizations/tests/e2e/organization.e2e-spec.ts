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
import { cleanupTestOrganization, createOrganizationDto, updateOrganizationDto } from '@common/tests/e2e/utils/setup-test-organization'
import { cleanupTestUser, loginTestUser, setupTestUser, TestUser } from '@common/tests/e2e/utils/setup-test-user'
import { EnvModule } from '@configs/env/env.module'
import { PrismaModule } from '@configs/prisma/prisma.module'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { AuthModule } from '@modules/auth/auth.module'
import { OrganizationsModule } from '@modules/organizations/organizations.module'

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
describe('Organizations Module (e2e)', () => {
  let app: INestApplication
  let prismaService: PrismaService
  let agent: ReturnType<typeof request.agent>
  let testUser: TestUser
  let createdOrganizationId: string

  beforeAll(async () => {
    // Create NestJS application
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [OrganizationsModule, AuthModule, LoggerModule, EnvModule, PrismaModule, AccountAccessModule]
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix(process.env.API_PREFIX ?? '/api')
    app.use(cookieParser())

    prismaService = moduleRef.get<PrismaService>(PrismaService)

    // Set up test user with necessary roles and permissions
    testUser = await setupTestUser(prismaService, {
      email: 'orgtest@billmate.test',
      password: 'TestPassword123',
      firstname: 'Organization',
      lastname: 'Manager',
      roles: ['user', 'admin'],
      permissions: ['ORGANIZATION_CREATION', 'ORGANIZATION_UPDATE']
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
    // Clean up test data
    if (createdOrganizationId) {
      await cleanupTestOrganization(prismaService, createdOrganizationId)
    }

    // Clean up test user
    await cleanupTestUser(prismaService, testUser.email)

    await prismaService.$disconnect()
    await app.close()
  })

  describe('Organization Creation', () => {
    it('should successfully create a new organization when authenticated', async () => {
      // Use utility to create DTO
      const dto = createOrganizationDto(testUser.accountId, OrganizationType.COMPANY, `Test Organization ${Date.now()}`)

      const response = await agent.post('/api/organizations').send(dto).expect(201)

      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('name', dto.name)
      expect(response.body).toHaveProperty('type', dto.type)
      expect(response.body).toHaveProperty('description', dto.description)
      expect(response.body).toHaveProperty('website', dto.website)

      // Store created organization ID for other tests
      createdOrganizationId = response.body.id
    })

    it('should reject organization creation when not authenticated', async () => {
      // Use utility to create DTO
      const dto = createOrganizationDto(testUser.accountId)

      await request(app.getHttpServer()).post('/api/organizations').send(dto).expect(401)
    })
  })

  describe('Organization Fetch', () => {
    it('should successfully fetch an organization when authenticated', async () => {
      // Skip if no organization was created in the previous test
      if (!createdOrganizationId) {
        return console.warn('Skipping test: no organization was created')
      }

      const response = await agent.get(`/api/organizations/${createdOrganizationId}`).expect(200)

      expect(response.body).toHaveProperty('id', createdOrganizationId)
      expect(response.body).toHaveProperty('name')
      expect(response.body).toHaveProperty('type')
    })

    it('should reject fetching organization when not authenticated', async () => {
      if (!createdOrganizationId) {
        return console.warn('Skipping test: no organization was created')
      }

      await request(app.getHttpServer()).get(`/api/organizations/${createdOrganizationId}`).expect(401)
    })

    it('should return 404 for non-existent organization', async () => {
      await agent.get('/api/organizations/non-existent-id').expect(404)
    })
  })

  describe('Organization Update', () => {
    it('should successfully update an organization when authenticated', async () => {
      if (!createdOrganizationId) {
        return console.warn('Skipping test: no organization was created')
      }

      // Use utility to create update DTO
      const dto = updateOrganizationDto({
        name: `Updated Organization ${Date.now()}`,
        description: 'Updated organization description for E2E test'
      })

      const response = await agent.patch(`/api/organizations/${createdOrganizationId}`).send(dto).expect(200)

      expect(response.body).toHaveProperty('id', createdOrganizationId)
      expect(response.body).toHaveProperty('name', dto.name)
      expect(response.body).toHaveProperty('description', dto.description)
    })

    it('should reject updating organization when not authenticated', async () => {
      if (!createdOrganizationId) {
        return console.warn('Skipping test: no organization was created')
      }

      const dto = updateOrganizationDto({
        name: 'Updated Organization'
      })

      await request(app.getHttpServer()).patch(`/api/organizations/${createdOrganizationId}`).send(dto).expect(401)
    })

    it('should return 404 for updating non-existent organization', async () => {
      const dto = updateOrganizationDto({
        name: 'Updated Organization'
      })

      await agent.patch('/api/organizations/non-existent-id').send(dto).expect(404)
    })
  })
})
