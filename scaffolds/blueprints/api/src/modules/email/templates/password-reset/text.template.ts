import { Locale } from '@prisma/client'
import { TranslationService } from '../../services/translation.service'

export const getPasswordResetTextTemplate = (resetUrl: string, translationService: TranslationService, locale: Locale, firstName?: string): string => {
  const t = translationService.getTranslation(locale, 'passwordReset')
  const greeting = firstName ? `${t.greeting} ${firstName},` : `${t.greeting},`

  return `
${t.title}

${greeting}

${t.body}

${t.button} : ${resetUrl}

${t.fallback}

${t.expiration}
${t.ignore}

---
${t.footer}
`
}
