/**
 * Resources
 */
import { Test, TestingModule } from '@nestjs/testing'
import { Locale } from '@prisma/client'

/**
 * Dependencies
 */
import { TranslationService } from '@modules/email/services/translation.service'

/**
 * Test
 */
describe('TranslationService', () => {
  let service: TranslationService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TranslationService]
    }).compile()

    service = module.get<TranslationService>(TranslationService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('getTranslation', () => {
    it('should return English translations when locale is EN', () => {
      const result = service.getTranslation(Locale.EN, 'accountConfirmation')
      expect(result).toBeDefined()
      expect(result.subject).toBeDefined()
      expect(result.title).toBeDefined()
      expect(result.body).toBeDefined()
      expect(result.button).toBeDefined()
      expect(result.fallback).toBeDefined()
      expect(result.ignore).toBeDefined()
      expect(result.footer).toBeDefined()
    })

    it('should return French translations when locale is FR', () => {
      const result = service.getTranslation(Locale.FR, 'accountConfirmation')
      expect(result).toBeDefined()
      expect(result.subject).toBeDefined()
      expect(result.title).toBeDefined()
      expect(result.body).toBeDefined()
      expect(result.button).toBeDefined()
      expect(result.fallback).toBeDefined()
      expect(result.ignore).toBeDefined()
      expect(result.footer).toBeDefined()
    })

    it('should return English translations as fallback for unknown locale', () => {
      const result = service.getTranslation('unknown' as Locale, 'accountConfirmation')
      expect(result).toBeDefined()
      expect(result.subject).toBeDefined()
      expect(result.title).toBeDefined()
      expect(result.body).toBeDefined()
      expect(result.button).toBeDefined()
      expect(result.fallback).toBeDefined()
      expect(result.ignore).toBeDefined()
      expect(result.footer).toBeDefined()
    })

    it('should return password reset template with expiration field', () => {
      const result = service.getTranslation(Locale.EN, 'passwordReset')
      expect(result).toBeDefined()
      expect(result.subject).toBeDefined()
      expect(result.title).toBeDefined()
      expect(result.body).toBeDefined()
      expect(result.button).toBeDefined()
      expect(result.fallback).toBeDefined()
      expect(result.ignore).toBeDefined()
      expect(result.footer).toBeDefined()
      expect(result.expiration).toBeDefined()
    })

    it('should return undefined for invalid translation key', () => {
      // @ts-expect-error - Testing invalid key
      const result = service.getTranslation(Locale.EN, 'invalidKey')
      expect(result).toBeUndefined()
    })
  })
})
