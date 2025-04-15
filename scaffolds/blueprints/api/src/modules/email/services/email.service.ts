/**
 * Resources
 */
import { Logger } from '@common/services/logger/logger.service'
import { Injectable } from '@nestjs/common'
import { Locale } from '@prisma/client'

/**
 * Dependencies
 */
import { UserDefaults } from '@configs/db/user.config'
import { EnvConfig } from '@configs/env/services/env.service'
// import { EmailOptions, MailerSendService } from '@modules/email/services/mailersend.service'
import { TranslationService } from '@modules/email/services/translation.service'

/**
 * Templates
 */
import { getAccountConfirmationHtmlTemplate } from '@modules/email/templates/account-confirmation/html.template'
import { getAccountConfirmationTextTemplate } from '@modules/email/templates/account-confirmation/text.template'
import { getPasswordResetHtmlTemplate } from '@modules/email/templates/password-reset/html.template'
import { getPasswordResetTextTemplate } from '@modules/email/templates/password-reset/text.template'

/**
 * Declaration
 */
@Injectable()
export class EmailService {
  constructor(
    // private readonly mailerSendService: MailerSendService,
    private readonly logger: Logger,
    private readonly translationService: TranslationService,
    private readonly envConfig: EnvConfig
  ) {}

  async sendAccountConfirmationEmail(email: string, confirmationToken: string, firstName: string, locale: Locale = UserDefaults.preferences.locale): Promise<void> {
    try {
      this.logger.log(`Sending account confirmation email to ${email}`)
      const confirmationUrl = `${this.envConfig.get('FRONTEND_URL')}/signin?confirmAccountToken=${confirmationToken}`
      const html = getAccountConfirmationHtmlTemplate(confirmationUrl, this.translationService, locale, firstName)
      const text = getAccountConfirmationTextTemplate(confirmationUrl, this.translationService, locale, firstName)

      console.log('html', html)
      console.log('text', text)
      // await this.sendEmail({
      //   to: email,
      //   subject: this.translationService.getTranslation(locale, 'accountConfirmation').subject,
      //   html,
      //   text
      // })
      this.logger.log(`Account confirmation email sent successfully to ${email}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Failed to send account confirmation email to ${email}: ${errorMessage}`)
      throw new Error(`Failed to send account confirmation email: ${errorMessage}`)
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, firstName: string, locale: Locale = UserDefaults.preferences.locale): Promise<void> {
    try {
      this.logger.log(`Sending password reset email to ${email}`)
      const resetUrl = `${this.envConfig.get('FRONTEND_URL')}/reset-password?resetPasswordToken=${resetToken}`
      const html = getPasswordResetHtmlTemplate(resetUrl, this.translationService, locale, firstName)
      const text = getPasswordResetTextTemplate(resetUrl, this.translationService, locale, firstName)

      console.log('html', html)
      console.log('text', text)
      // await this.sendEmail({
      //   to: email,
      //   subject: this.translationService.getTranslation(locale, 'passwordReset').subject,
      //   html,
      //   text
      // })
      this.logger.log(`Password reset email sent successfully to ${email}`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Failed to send password reset email to ${email}: ${errorMessage}`)
      throw new Error(`Failed to send password reset email: ${errorMessage}`)
    }
  }

  // private async sendEmail(options: EmailOptions): Promise<void> {
  //   try {
  //     await this.mailerSendService.sendEmail(options)
  //   } catch (error) {
  //     const errorMessage = error instanceof Error ? error.message : 'Unknown error'
  //     this.logger.error(`Failed to send email to ${options.to}: ${errorMessage}`)
  //     throw error
  //   }
  // }
}
