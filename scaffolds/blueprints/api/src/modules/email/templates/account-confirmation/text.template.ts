import { Locale } from '@prisma/client'
import { TranslationService } from '../../services/translation.service'

export const getAccountConfirmationTextTemplate = (confirmationUrl: string, translationService: TranslationService, locale: Locale, firstName?: string): string => {
  const t = translationService.getTranslation(locale, 'accountConfirmation')
  const greeting = firstName ? `${t.greeting} ${firstName},` : `${t.greeting},`

  return `
${t.title}

${greeting}

${t.body}

${t.button} : ${confirmationUrl}

${t.fallback}

${t.ignore}

---
${t.footer}
`
}
