/**
 * Resources
 */
import { Injectable } from '@nestjs/common'
import { Locale } from '@prisma/client'

/**
 * Locales
 */
import { en } from '@modules/email/locales/en'
import { fr } from '@modules/email/locales/fr'

/**
 * Type
 */
interface EmailTemplate {
  subject: string
  title: string
  body: string
  button: string
  fallback: string
  ignore: string
  footer: string
}

interface PasswordResetTemplate extends EmailTemplate {
  expiration: string
}

/**
 * Declaration
 */
interface Translations {
  accountConfirmation: EmailTemplate
  passwordReset: PasswordResetTemplate
}

export type TranslationKey = keyof Translations

@Injectable()
export class TranslationService {
  private readonly translations: Record<Locale, Translations> = {
    [Locale.FR]: fr,
    [Locale.EN]: en
  }

  getTranslation<K extends TranslationKey>(locale: Locale, key: K): Translations[K] {
    return this.translations[locale]?.[key] ?? this.translations[Locale.EN][key]
  }
}
