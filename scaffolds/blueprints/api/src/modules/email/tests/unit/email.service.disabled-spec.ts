/**
 * Resources
 */
import { EnvConfig } from '@configs/env/services/env.service'
import { Test, TestingModule } from '@nestjs/testing'
import { Locale } from '@prisma/client'

/**
 * Dependencies
 */
import { Logger } from '@common/services/logger/logger.service'
import { EmailService } from '@modules/email/services/email.service'
import { MailerSendService } from '@modules/email/services/mailersend.service'
import { TranslationService } from '@modules/email/services/translation.service'

/**
 * Test
 */
describe('EmailService', () => {
  let service: EmailService
  let mailerSendService: jest.Mocked<MailerSendService>
  let logger: jest.Mocked<Logger>
  let translationService: jest.Mocked<TranslationService>
  let envConfig: jest.Mocked<EnvConfig>

  beforeEach(async () => {
    // Create mocks
    mailerSendService = {
      sendEmail: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<MailerSendService>

    logger = {
      log: jest.fn(),
      error: jest.fn()
    } as unknown as jest.Mocked<Logger>

    translationService = {
      getTranslation: jest.fn().mockReturnValue({ subject: 'Test Subject' })
    } as unknown as jest.Mocked<TranslationService>

    envConfig = {
      get: jest.fn().mockReturnValue('http://localhost:3000')
    } as unknown as jest.Mocked<EnvConfig>

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: MailerSendService,
          useValue: mailerSendService
        },
        {
          provide: Logger,
          useValue: logger
        },
        {
          provide: TranslationService,
          useValue: translationService
        },
        {
          provide: EnvConfig,
          useValue: envConfig
        }
      ]
    }).compile()

    service = module.get<EmailService>(EmailService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('sendAccountConfirmationEmail', () => {
    it('should send account confirmation email successfully', async () => {
      const email = 'test@example.com'
      const confirmationToken = 'test-token'
      const firstName = 'John'
      const locale = Locale.EN

      await service.sendAccountConfirmationEmail(email, confirmationToken, firstName, locale)

      expect(envConfig.get).toHaveBeenCalledWith('FRONTEND_URL')
      expect(translationService.getTranslation).toHaveBeenCalledWith(locale, 'accountConfirmation')
      expect(mailerSendService.sendEmail).toHaveBeenCalled()
      expect(logger.log).toHaveBeenCalledWith(`Account confirmation email sent successfully to ${email}`)
    })

    it('should handle errors when sending account confirmation email', async () => {
      const email = 'test@example.com'
      const confirmationToken = 'test-token'
      const firstName = 'John'
      const error = new Error('Test error')

      mailerSendService.sendEmail.mockRejectedValueOnce(error)

      await expect(service.sendAccountConfirmationEmail(email, confirmationToken, firstName)).rejects.toThrow('Failed to send account confirmation email: Test error')

      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const email = 'test@example.com'
      const resetToken = 'test-token'
      const firstName = 'John'
      const locale = Locale.EN

      await service.sendPasswordResetEmail(email, resetToken, firstName, locale)

      expect(envConfig.get).toHaveBeenCalledWith('FRONTEND_URL')
      expect(translationService.getTranslation).toHaveBeenCalledWith(locale, 'passwordReset')
      expect(mailerSendService.sendEmail).toHaveBeenCalled()
      expect(logger.log).toHaveBeenCalledWith(`Password reset email sent successfully to ${email}`)
    })

    it('should handle errors when sending password reset email', async () => {
      const email = 'test@example.com'
      const resetToken = 'test-token'
      const firstName = 'John'
      const error = new Error('Test error')

      mailerSendService.sendEmail.mockRejectedValueOnce(error)

      await expect(service.sendPasswordResetEmail(email, resetToken, firstName)).rejects.toThrow('Failed to send password reset email: Test error')

      expect(logger.error).toHaveBeenCalled()
    })
  })
})
