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
export const getInvitationHtmlTemplate = (invitationUrl: string, translationService: TranslationService, locale: Locale, inviterName?: string, inviteeName?: string): string => {
  const t = translationService.getTranslation(locale, 'invitation')
  const greeting = inviteeName ? `${t.greeting} ${inviteeName},` : `${t.greeting},`
  const body = inviterName ? t.bodyWithName.replace('{inviterName}', inviterName) : t.bodyWithoutName
  const year = new Date().getFullYear().toString()
  const footer = t.footer.replace('{year}', year)

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t.subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2c3e50; text-align: center;">${t.title}</h1>

    <p>${greeting}</p>

    <p>${body}</p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="${invitationUrl}"
           style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            ${t.button}
        </a>
    </div>

    <p>${t.fallback}</p>
    <p style="word-break: break-all;">${invitationUrl}</p>

    <p>${t.expiration}</p>
    <p>${t.ignore}</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

    <p style="font-size: 12px; color: #666; text-align: center;">
        ${footer}
    </p>
</body>
</html>
`
}
