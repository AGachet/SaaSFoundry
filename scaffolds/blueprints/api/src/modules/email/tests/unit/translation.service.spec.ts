/**
 * Resources
 */
import { Provider } from '@nestjs/common'
import { Locale } from '@prisma/client'

/**
 * Dependencies
 */
import { TranslationService } from '@modules/email/services/translation.service'

/**
 * Test infrastructure
 */
import { ServiceTestBase } from '@common/tests/unit/base/service-test-base'
import { TestScenario } from '@common/tests/unit/utils/advanced-test-utils'

/**
 * Test implementation using the new infrastructure
 */
class TranslationServiceTest extends ServiceTestBase<TranslationService> {
  protected getServiceClass() {
    return TranslationService
  }

  protected getProviders(): Provider[] {
    return [TranslationService]
  }

  /**
   * Test getTranslation functionality
   */
  testGetTranslation(): void {
    describe('getTranslation', () => {
      describe('for English locale', () => {
        const englishScenario = TestScenario.create('English translations', async () => {
          // No setup needed
        })

        it('should return English translations when locale is EN', async () => {
          await englishScenario.execute(async () => {
            // Act
            const result = this.service.getTranslation(Locale.EN, 'accountConfirmation')

            // Assert
            expect(result).toBeDefined()
            expect(result.subject).toBeDefined()
            expect(result.title).toBeDefined()
            expect(result.body).toBeDefined()
            expect(result.button).toBeDefined()
            expect(result.fallback).toBeDefined()
            expect(result.ignore).toBeDefined()
            expect(result.footer).toBeDefined()
            expect(result.greeting).toBeDefined()
          })
        })
      })

      describe('for French locale', () => {
        const frenchScenario = TestScenario.create('French translations', async () => {
          // No setup needed
        })

        it('should return French translations when locale is FR', async () => {
          await frenchScenario.execute(async () => {
            // Act
            const result = this.service.getTranslation(Locale.FR, 'accountConfirmation')

            // Assert
            expect(result).toBeDefined()
            expect(result.subject).toBeDefined()
            expect(result.title).toBeDefined()
            expect(result.body).toBeDefined()
            expect(result.button).toBeDefined()
            expect(result.fallback).toBeDefined()
            expect(result.ignore).toBeDefined()
            expect(result.footer).toBeDefined()
            expect(result.greeting).toBeDefined()
          })
        })
      })

      describe('for unknown locale', () => {
        const unknownLocaleScenario = TestScenario.create('unknown locale', async () => {
          // No setup needed
        })

        it('should return English translations as fallback for unknown locale', async () => {
          await unknownLocaleScenario.execute(async () => {
            // Act
            const result = this.service.getTranslation('unknown' as Locale, 'accountConfirmation')

            // Assert
            expect(result).toBeDefined()
            expect(result.subject).toBeDefined()
            expect(result.title).toBeDefined()
            expect(result.body).toBeDefined()
            expect(result.button).toBeDefined()
            expect(result.fallback).toBeDefined()
            expect(result.ignore).toBeDefined()
            expect(result.footer).toBeDefined()
            expect(result.greeting).toBeDefined()
          })
        })
      })

      describe('password reset template', () => {
        const passwordResetScenario = TestScenario.create('password reset template', async () => {
          // No setup needed
        })

        it('should return password reset template with expiration field', async () => {
          await passwordResetScenario.execute(async () => {
            // Act
            const result = this.service.getTranslation(Locale.EN, 'passwordReset')

            // Assert
            expect(result).toBeDefined()
            expect(result.subject).toBeDefined()
            expect(result.title).toBeDefined()
            expect(result.body).toBeDefined()
            expect(result.button).toBeDefined()
            expect(result.fallback).toBeDefined()
            expect(result.ignore).toBeDefined()
            expect(result.footer).toBeDefined()
            expect(result.expiration).toBeDefined()
            expect(result.greeting).toBeDefined()
          })
        })
      })

      describe('error handling', () => {
        const errorScenario = TestScenario.create('invalid translation key', async () => {
          // No setup needed
        })

        it('should return undefined for invalid translation key', async () => {
          await errorScenario.execute(async () => {
            // Act
            // @ts-expect-error - Testing invalid key
            const result = this.service.getTranslation(Locale.EN, 'invalidKey')

            // Assert
            expect(result).toBeUndefined()
          })
        })
      })
    })
  }
}

// Execute the tests
describe('TranslationService (Refactored)', () => {
  const translationServiceTest = new TranslationServiceTest()

  beforeEach(async () => {
    await translationServiceTest.setupTest()
  })

  afterEach(async () => {
    await translationServiceTest.cleanupTest()
  })

  // Run all test suites
  translationServiceTest.testGetTranslation()
})
