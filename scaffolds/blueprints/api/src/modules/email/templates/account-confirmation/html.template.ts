import { Locale } from '@prisma/client'
import { TranslationService } from '../../services/translation.service'

export const getAccountConfirmationHtmlTemplate = (confirmationUrl: string, translationService: TranslationService, locale: Locale, firstName: string): string => {
  const t = translationService.getTranslation(locale, 'accountConfirmation')

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

    <p>Bonjour ${firstName},</p>

    <p>${t.body}</p>

    <div style="text-align: center; margin: 30px 0;">
        <a href="${confirmationUrl}"
           style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            ${t.button}
        </a>
    </div>

    <p>${t.fallback}</p>
    <p style="word-break: break-all;">${confirmationUrl}</p>

    <p>${t.ignore}</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">

    <p style="font-size: 12px; color: #666; text-align: center;">
        ${t.footer}
    </p>
</body>
</html>
`
}
