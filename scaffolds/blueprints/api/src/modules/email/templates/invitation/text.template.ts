/**
 * Resources
 */
import { Locale } from '@prisma/client'

/**
 * Dependencies
 */
import { TranslationService } from '@modules/email/services/translation.service'

/**
 * Declaration
 */
export const getInvitationTextTemplate = (invitationUrl: string, translationService: TranslationService, locale: Locale, inviterName?: string, inviteeName?: string): string => {
  const t = translationService.getTranslation(locale, 'invitation')
  const greeting = inviteeName ? `${t.greeting} ${inviteeName},` : `${t.greeting},`
  const body = inviterName ? t.bodyWithName.replace('{inviterName}', inviterName) : t.bodyWithoutName
  const year = new Date().getFullYear().toString()
  const footer = t.footer.replace('{year}', year)

  return `
${t.title}

${greeting}

${body}

${t.button} : ${invitationUrl}

${t.fallback}

${t.expiration}
${t.ignore}

---
${footer}
`
}
