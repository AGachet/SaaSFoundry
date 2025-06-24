/**
 * Resources
 */
import { EnvConfig } from '@configs/env/services/env.service'
import { Provider } from '@nestjs/common'
import { Locale } from '@prisma/client'

/**
 * Dependencies
 */
import { Logger } from '@common/services/logger/logger.service'
import { EmailService } from '@modules/email/services/email.service'
import { MailerSendService } from '@modules/email/services/mailersend.service'
import { TranslationService } from '@modules/email/services/translation.service'

/**
 * Test infrastructure
 */
import { ServiceTestBase } from '@common/tests/unit/base/service-test-base'
import { mockEnvConfig, mockLogger } from '@common/tests/unit/mocks/service-mocks'
import { TestAssertions, TestScenario } from '@common/tests/unit/utils/advanced-test-utils'

/**
 * Test implementation using the new infrastructure
 */
class EmailServiceTest extends ServiceTestBase<EmailService> {
  private mailerSendService: jest.Mocked<MailerSendService>
  private translationService: jest.Mocked<TranslationService>
  private logger: jest.Mocked<Logger>
  private envConfig: jest.Mocked<EnvConfig>

  protected getServiceClass() {
    return EmailService
  }

  protected getProviders(): Provider[] {
    return [
      {
        provide: MailerSendService,
        useValue: {
          sendEmail: jest.fn().mockResolvedValue(undefined)
        }
      },
      {
        provide: Logger,
        useValue: mockLogger
      },
      {
        provide: TranslationService,
        useValue: {
          getTranslation: jest.fn().mockReturnValue({ subject: 'Test Subject' })
        }
      },
      {
        provide: EnvConfig,
        useValue: mockEnvConfig
      }
    ]
  }

  protected async customSetup(): Promise<void> {
    // Get service references
    this.mailerSendService = this.getService(MailerSendService)
    this.translationService = this.getService(TranslationService)
    this.logger = this.getService(Logger)
    this.envConfig = this.getService(EnvConfig)
  }

  /**
   * Test sendAccountConfirmationEmail functionality
   */
  testSendAccountConfirmationEmail(): void {
    describe('sendAccountConfirmationEmail', () => {
      const email = 'test@example.com'
      const confirmationToken = 'test-token'
      const firstName = 'John'
      const locale = Locale.EN

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful email sending', async () => {
          this.envConfig.get.mockReturnValue('http://localhost:3000')
          this.translationService.getTranslation.mockReturnValue({
            subject: 'Account Confirmation',
            title: 'Welcome',
            body: 'Thank you for signing up',
            button: 'Confirm Account',
            fallback: 'Confirm your account',
            ignore: 'Ignore this email',
            footer: 'Footer',
            greeting: 'Hello'
          })
        })

        it('should send account confirmation email successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            await this.service.sendAccountConfirmationEmail(email, confirmationToken, firstName, locale)

            // Verify
            expect(this.envConfig.get).toHaveBeenCalledWith('FRONTEND_URL')
            expect(this.translationService.getTranslation).toHaveBeenCalledWith(locale, 'accountConfirmation')
            expect(this.mailerSendService.sendEmail).toHaveBeenCalled()
            expect(this.logger.log).toHaveBeenCalledWith(`Account confirmation email sent successfully to ${email}`)
          })
        })
      })

      describe('when errors occur', () => {
        const errorScenario = TestScenario.create('email sending failure', async () => {
          this.envConfig.get.mockReturnValue('http://localhost:3000')
          this.translationService.getTranslation.mockReturnValue({
            subject: 'Account Confirmation',
            title: 'Welcome',
            body: 'Thank you for signing up',
            button: 'Confirm Account',
            fallback: 'Confirm your account',
            ignore: 'Ignore this email',
            footer: 'Footer',
            greeting: 'Hello'
          })
          const error = new Error('Test error')
          this.mailerSendService.sendEmail.mockRejectedValueOnce(error)
        })

        it('should handle errors when sending account confirmation email', async () => {
          await errorScenario.execute(async () => {
            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.sendAccountConfirmationEmail(email, confirmationToken, firstName), Error, 'Failed to send account confirmation email: Test error')

            // Verify
            expect(this.logger.error).toHaveBeenCalled()
          })
        })
      })
    })
  }

  /**
   * Test sendPasswordResetEmail functionality
   */
  testSendPasswordResetEmail(): void {
    describe('sendPasswordResetEmail', () => {
      const email = 'test@example.com'
      const resetToken = 'test-token'
      const firstName = 'John'
      const locale = Locale.EN

      describe('when successful', () => {
        const successScenario = TestScenario.create('successful email sending', async () => {
          this.envConfig.get.mockReturnValue('http://localhost:3000')
          this.translationService.getTranslation.mockReturnValue({
            subject: 'Password Reset',
            title: 'Reset Your Password',
            body: 'You requested a password reset',
            button: 'Reset Password',
            fallback: 'Reset your password',
            ignore: 'Ignore this email',
            footer: 'Footer',
            expiration: 'This link will expire in 1 hour',
            greeting: 'Hello'
          })
        })

        it('should send password reset email successfully', async () => {
          await successScenario.execute(async () => {
            // Act
            await this.service.sendPasswordResetEmail(email, resetToken, firstName, locale)

            // Verify
            expect(this.envConfig.get).toHaveBeenCalledWith('FRONTEND_URL')
            expect(this.translationService.getTranslation).toHaveBeenCalledWith(locale, 'passwordReset')
            expect(this.mailerSendService.sendEmail).toHaveBeenCalled()
            expect(this.logger.log).toHaveBeenCalledWith(`Password reset email sent successfully to ${email}`)
          })
        })
      })

      describe('when errors occur', () => {
        const errorScenario = TestScenario.create('email sending failure', async () => {
          this.envConfig.get.mockReturnValue('http://localhost:3000')
          this.translationService.getTranslation.mockReturnValue({
            subject: 'Password Reset',
            title: 'Reset Your Password',
            body: 'You requested a password reset',
            button: 'Reset Password',
            fallback: 'Reset your password',
            ignore: 'Ignore this email',
            footer: 'Footer',
            expiration: 'This link will expire in 1 hour',
            greeting: 'Hello'
          })
          const error = new Error('Test error')
          this.mailerSendService.sendEmail.mockRejectedValueOnce(error)
        })

        it('should handle errors when sending password reset email', async () => {
          await errorScenario.execute(async () => {
            // Act & Assert
            await TestAssertions.assertThrows(() => this.service.sendPasswordResetEmail(email, resetToken, firstName), Error, 'Failed to send password reset email: Test error')

            // Verify
            expect(this.logger.error).toHaveBeenCalled()
          })
        })
      })
    })
  }
}

// Execute the tests
describe('EmailService (Refactored)', () => {
  const emailServiceTest = new EmailServiceTest()

  beforeEach(async () => {
    await emailServiceTest.setupTest()
  })

  afterEach(async () => {
    await emailServiceTest.cleanupTest()
  })

  // Run all test suites
  emailServiceTest.testSendAccountConfirmationEmail()
  emailServiceTest.testSendPasswordResetEmail()
})
