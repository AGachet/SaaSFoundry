import { Locale } from '@prisma/client'
import { TranslationService } from '../../services/translation.service'

export const getAccountConfirmationTextTemplate = (confirmationUrl: string, translationService: TranslationService, locale: Locale, firstName: string): string => {
  const t = translationService.getTranslation(locale, 'accountConfirmation')

  return `
${t.title}

Bonjour ${firstName},

${t.body}

${t.button} : ${confirmationUrl}

${t.fallback}

${t.ignore}

---
${t.footer}
`
}
