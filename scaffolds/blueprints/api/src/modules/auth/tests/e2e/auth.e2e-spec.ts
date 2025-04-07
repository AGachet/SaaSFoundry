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
import { LoggerModule } from '@common/services/logger/logger.module'
import { EnvModule } from '@configs/env/env.module'
import { PrismaModule } from '@configs/prisma/prisma.module'
import { PrismaService } from '@configs/prisma/services/prisma.service'
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
 * Declaration
 */
describe('Auth Module (e2e)', () => {
  let app: INestApplication
  let prismaService: PrismaService
  let agent: ReturnType<typeof request.agent>

  // Test user data
  const testUser = {
    email: 'batman@diamondforge.fr',
    password: 'brucewaynepassword',
    firstname: 'Bruce',
    lastname: 'Wayne'
  }

  // Variables to store tokens and user ID
  let userId: string
  let confirmAccountToken: string
  let resetPasswordToken: string

  beforeAll(async () => {
    // Create NestJS application
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, LoggerModule, EnvModule, PrismaModule]
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
    // Clean up database after tests
    const user = await prismaService.user.findUnique({
      where: { email: testUser.email }
    })

    if (user) {
      // Delete user (all related records will be deleted automatically)
      await prismaService.user.delete({
        where: { id: user.id }
      })
    }

    await prismaService.$disconnect()
    await app.close()
  })

  describe('Complete authentication flow', () => {
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
      expect(response.body).toHaveProperty('firstname')
      expect(response.body).toHaveProperty('lastname')
      expect(response.body).toHaveProperty('roles')

      expect(response.body.userId).toBe(userId)
      expect(response.body.firstname).toBe(testUser.firstname)
      expect(response.body.lastname).toBe(testUser.lastname)
      expect(response.body.email).toBe(testUser.email)
      expect(response.body.roles).toEqual(['user'])
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
