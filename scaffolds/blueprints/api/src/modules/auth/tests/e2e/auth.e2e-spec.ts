/**
 * Resources
 */
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import * as dotenv from 'dotenv'
import request from 'supertest'

/**
 * Dependencies
 */
import { AccountAccessModule } from '@common/services/account-access/account-access.module'
import { LoggerModule } from '@common/services/logger/logger.module'
import { cleanupTestUser } from '@common/tests/e2e/utils/setup-test-user'
import { EnvModule } from '@configs/env/env.module'
import { PrismaModule } from '@configs/prisma/prisma.module'
import { PrismaService } from '@configs/prisma/services/prisma.service'
import { AccountsModule } from '@modules/accounts/accounts.module'
import { AuthModule } from '@modules/auth/auth.module'

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
describe('Auth Module (e2e)', () => {
  let app: INestApplication
  let prismaService: PrismaService
  let agent: ReturnType<typeof request.agent>

  // Test user data - only for authentication tests
  const testUser = {
    email: 'batman@diamondforge.fr',
    password: 'brucewaynepassword',
    firstname: 'Bruce',
    lastname: 'Wayne'
  }

  // Variables to store tokens and user ID
  let userId: string
  let accountId: string
  let confirmAccountToken: string
  let resetPasswordToken: string

  beforeAll(async () => {
    // Create NestJS application
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, AccountsModule, LoggerModule, EnvModule, PrismaModule, AccountAccessModule]
    }).compile()

    app = moduleRef.createNestApplication()
    app.setGlobalPrefix(process.env.API_PREFIX ?? '/api')
    app.use(cookieParser())

    prismaService = moduleRef.get<PrismaService>(PrismaService)

    await app.init()

    // Create a supertest agent that will maintain cookies between requests
    agent = request.agent(app.getHttpServer())
  })

  afterAll(async () => {
    // Clean up test user with the common utility
    await cleanupTestUser(prismaService, testUser.email)

    await prismaService.$disconnect()
    await app.close()
  })

  describe('Complete authentication flow with account creation', () => {
    it('Should create a new user (signup)', async () => {
      const response = await agent.post('/api/auth/signup').send(testUser).expect(200)

      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('confirmationToken')

      // Store confirmation token for next tests
      confirmAccountToken = response.body.confirmationToken

      // Verify user exists in database
      const user = await prismaService.user.findUnique({
        where: { email: testUser.email }
      })

      expect(user).toBeDefined()
      expect(user?.email).toBe(testUser.email)
      expect(user?.isActive).toBe(false)

      // Store user ID for next tests
      userId = user!.id
    })

    it('Should not allow login for unconfirmed account', async () => {
      const response = await agent
        .post('/api/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(401)

      expect(response.body).toHaveProperty('message')
      expect(response.body.message).toContain('Invalid email or password')
      expect(response.body.message).not.toHaveProperty('userId')
    })

    it('Should confirm the creation and connect the user (signin with token)', async () => {
      const response = await agent
        .post('/api/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.password,
          firstname: testUser.firstname,
          lastname: testUser.lastname,
          confirmAccountToken
        })
        .expect(200)

      expect(response.body).toHaveProperty('userId')
      expect(response.body.userId).toBe(userId)

      // Verify user is now active
      const user = await prismaService.user.findUnique({
        where: { id: userId }
      })

      expect(user?.isActive).toBe(true)

      // check that an account has been created for the user
      const accounts = await prismaService.account.findMany({
        where: {
          usersLinked: {
            some: {
              userId
            }
          }
        }
      })

      expect(accounts.length).toBeGreaterThan(0)
      // store the ID of the first account for next tests
      accountId = accounts[0].id
    })

    it('Should logout the user (signout)', async () => {
      const response = await agent.post('/api/auth/signout').send({ userId }).expect(200)

      expect(response.body).toHaveProperty('message')

      // Try to access protected route after logout
      await agent.get('/api/auth/me').expect(401)
    })

    it('Should request a password change (request-password-reset)', async () => {
      const response = await agent.post('/api/auth/request-password-reset').send({ email: testUser.email }).expect(200)

      expect(response.body).toHaveProperty('message')
      // In test environment, we should receive the resetToken
      expect(response.body).toHaveProperty('resetToken')

      // Store reset token for next test
      resetPasswordToken = response.body.resetToken
      expect(resetPasswordToken).toBeDefined()
    })

    it('Should change the password (reset-password)', async () => {
      const newPassword = 'NewBruceWayne123'

      const response = await agent
        .post('/api/auth/reset-password')
        .send({
          resetPasswordToken,
          password: newPassword,
          confirmPassword: newPassword
        })
        .expect(200)

      expect(response.body).toHaveProperty('message')

      // Update test user password for next tests
      testUser.password = newPassword
    })

    it('Should connect with the new password (signin)', async () => {
      const response = await agent
        .post('/api/auth/signin')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200)

      expect(response.body).toHaveProperty('userId')
      expect(response.body.userId).toBe(userId)
    })

    it("Should retrieve the user's information (me)", async () => {
      const response = await agent.get('/api/auth/me').expect(200)

      expect(response.body).toHaveProperty('userId')
      expect(response.body).toHaveProperty('people')
      expect(response.body.people).toHaveProperty('firstname')
      expect(response.body.people).toHaveProperty('lastname')
      expect(response.body).toHaveProperty('roles')
      expect(response.body).toHaveProperty('accounts')
      expect(response.body).toHaveProperty('permissions')
      expect(response.body).toHaveProperty('modules')

      expect(response.body.userId).toBe(userId)
      expect(response.body.people.firstname).toBe(testUser.firstname)
      expect(response.body.people.lastname).toBe(testUser.lastname)
      expect(response.body.email).toBe(testUser.email)
      expect(response.body.roles).toEqual(['admin'])

      // Verify account information
      expect(response.body.accounts).toBeInstanceOf(Array)
      expect(response.body.accounts.length).toBeGreaterThan(0)

      // check that the account is active
      const account = response.body.accounts.find((acc) => acc.id === accountId)
      if (account) {
        expect(account.name).toBeDefined()
        expect(account.isActive).toBe(true)
      }

      // Verify admin permissions based on default_user_modules_roles.sql
      const expectedPermissions = [
        'PASSWORD_RECOVERY_LINK_REQUEST_OWN',
        'PASSWORD_RECOVERY_RESET_OWN',
        'ACCOUNT_UPDATE',
        'ACCOUNT_USER_MANAGEMENT',
        'ENTITY_CREATION',
        'USER_ACCOUNTS_INVITATION',
        'USER_ENTITIES_INVITATION',
        'USER_ROLE_ALLOCATION',
        'ENTITY_USER_MANAGEMENT',
        'ORGANIZATION_CREATION',
        'ORGANIZATION_UPDATE'
      ]

      expect(response.body.permissions).toBeInstanceOf(Array)
      expectedPermissions.forEach((permission) => {
        expect(response.body.permissions).toContain(permission)
      })

      // Verify modules
      const expectedModules = ['ACCOUNT_ADMINISTRATION', 'ORGANIZATION_ADMINISTRATION', 'USER_ACCOUNT_PASSWORD_RECOVERY']

      expect(response.body.modules).toBeInstanceOf(Array)
      expectedModules.forEach((module) => {
        expect(response.body.modules).toContain(module)
      })
    })

    it('Should retrieve guest information', async () => {
      const response = await agent.get('/api/auth/guest').expect(200)

      expect(response.body).toHaveProperty('roles')
      expect(response.body).toHaveProperty('modules')
      expect(response.body).toHaveProperty('permissions')

      expect(response.body.roles).toEqual(['guest'])
      expect(response.body.modules).toContain('USER_ACCOUNT_CREATION')
      expect(response.body.modules).toContain('USER_ACCOUNT_PASSWORD_RECOVERY')
      expect(response.body.permissions).toContain('USER_ACCOUNT_CREATE_OWN')
    })

    it('Should not require authentication for guest endpoint', async () => {
      const response = await request(app.getHttpServer()).get('/api/auth/guest').expect(200)

      expect(response.body).toHaveProperty('roles')
      expect(response.body).toHaveProperty('modules')
      expect(response.body).toHaveProperty('permissions')
    })
  })
})
