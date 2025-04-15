import { Locale } from '@prisma/client'
import { TranslationService } from '../../services/translation.service'

export const getPasswordResetTextTemplate = (resetUrl: string, translationService: TranslationService, locale: Locale, firstName: string): string => {
  const t = translationService.getTranslation(locale, 'passwordReset')

  return `
${t.title}

Bonjour ${firstName},

${t.body}

${t.button} : ${resetUrl}

${t.fallback}

${t.expiration}
${t.ignore}

---
${t.footer}
`
}
