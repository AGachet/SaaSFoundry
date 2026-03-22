import { copy } from 'fs-extra'
import { readFile, rename, writeFile } from 'fs/promises'
import { resolve } from 'path'

import { overlaysPath } from '../types'
import { fileExists } from '../utils'

interface InstallEmailModuleParams {
  apiPath: string
  mailersendApiKey: string
  mailersendSenderEmail: string
  mailersendSenderName: string
}

/**
 * Install the MailerSend email module on an API app.
 *
 * This function is fully self-contained and handles all aspects of adding the email module:
 * 1. Copies the MailerSend service file to the email services directory
 * 2. Uncomments `// TODO mailer-service-active:` markers in auth, invitation, env, and email services
 * 3. Updates email.module.ts to register the MailerSendService provider
 * 4. Renames the disabled email spec file to enable it
 * 5. Updates .env with MailerSend credentials
 * 6. Updates .env.test with test credentials
 * 7. Updates deployment.yml with MailerSend env vars (if file exists)
 *
 * Used by both `sf new` (during initial project generation) and `sf update` (when adding the module later).
 */
export async function installEmailModule({ apiPath, mailersendApiKey, mailersendSenderEmail, mailersendSenderName }: InstallEmailModuleParams) {
  // Copy MailerSend service to the API email services directory
  const mailerSendServicePath = resolve(overlaysPath, 'modules/email/services/mailersend.service.ts')
  const apiServicesPath = `${apiPath}/src/modules/email/services`
  await copy(mailerSendServicePath, `${apiServicesPath}/mailersend.service.ts`)

  // Uncomment email sending code in auth.service.ts
  const authServicePath = `${apiPath}/src/modules/auth/services/auth.service.ts`
  let authServiceContent = await readFile(authServicePath, 'utf8')
  authServiceContent = authServiceContent.replace(/\/\/ TODO mailer-service-active: /g, '').replace(/console\.log\('sendAccountConfirmationEmail', locale\)\n/g, '')
  await writeFile(authServicePath, authServiceContent)

  // Uncomment invitation sending code in invitation.service.ts
  const invitationServicePath = `${apiPath}/src/modules/invitation/services/invitation.service.ts`
  let invitationServiceContent = await readFile(invitationServicePath, 'utf8')
  invitationServiceContent = invitationServiceContent.replace(/\/\/ TODO mailer-service-active: /g, '').replace(/console\.log\('sendInvitationEmail', locale\)\n/g, '')
  await writeFile(invitationServicePath, invitationServiceContent)

  // Uncomment email configuration in env.service.ts
  const envServicePath = `${apiPath}/src/configs/env/services/env.service.ts`
  let envServiceContent = await readFile(envServicePath, 'utf8')
  envServiceContent = envServiceContent.replace(/\/\/ TODO mailer-service-active: /g, '')
  await writeFile(envServicePath, envServiceContent)

  // Uncomment email sending code in email.service.ts
  const emailServicePath = `${apiPath}/src/modules/email/services/email.service.ts`
  let emailServiceContent = await readFile(emailServicePath, 'utf8')
  emailServiceContent = emailServiceContent
    .replace(/^(\s*)\/\/ /gm, '$1')
    .replace(/[ \t]*console\.log\('html', html\)\n/g, '')
    .replace(/[ \t]*console\.log\('text', text\)\n/g, '')
  await writeFile(emailServicePath, emailServiceContent)

  // Update email.module.ts to include MailerSendService
  const emailModulePath = `${apiPath}/src/modules/email/email.module.ts`
  let emailModuleContent = await readFile(emailModulePath, 'utf8')
  emailModuleContent = emailModuleContent.replace(
    /import { TranslationService } from '@modules\/email\/services\/translation.service'/,
    `import { TranslationService } from '@modules/email/services/translation.service'\nimport { MailerSendService } from '@modules/email/services/mailersend.service'`
  )
  emailModuleContent = emailModuleContent.replace(/providers: \[EmailService, EnvConfig, TranslationService\]/, `providers: [EmailService, EnvConfig, TranslationService, MailerSendService]`)
  await writeFile(emailModulePath, emailModuleContent)

  // Rename email.service.disabled-spec.ts to email.service.spec.ts
  const emailServiceSpecPath = `${apiPath}/src/modules/email/tests/unit/email.service.disabled-spec.ts`
  const emailServiceSpecNewPath = `${apiPath}/src/modules/email/tests/unit/email.service.spec.ts`
  if (await fileExists(emailServiceSpecPath)) await rename(emailServiceSpecPath, emailServiceSpecNewPath)

  // Update .env with MailerSend credentials
  const envPath = `${apiPath}/.env`
  if (await fileExists(envPath)) {
    let envContent = await readFile(envPath, 'utf8')
    envContent = envContent
      .replace(/# MAILERSEND_API_KEY=.*$/m, `MAILERSEND_API_KEY="${mailersendApiKey}"`)
      .replace(/# MAILERSEND_SENDER_EMAIL=.*$/m, `MAILERSEND_SENDER_EMAIL="${mailersendSenderEmail}"`)
      .replace(/# MAILERSEND_SENDER_NAME=.*$/m, `MAILERSEND_SENDER_NAME="${mailersendSenderName}"`)
    await writeFile(envPath, envContent)
  }

  // Update .env.test with test credentials
  const envTestPath = `${apiPath}/.env.test`
  if (await fileExists(envTestPath)) {
    let envTestContent = await readFile(envTestPath, 'utf8')
    envTestContent = envTestContent
      .replace(/# MAILERSEND_API_KEY=.*$/m, `MAILERSEND_API_KEY="ms_test_fake_key_12345abcdef67890ghijklmnopqrstuvwxyz"`)
      .replace(/# MAILERSEND_SENDER_EMAIL=.*$/m, `MAILERSEND_SENDER_EMAIL="${mailersendSenderEmail}"`)
      .replace(/# MAILERSEND_SENDER_NAME=.*$/m, `MAILERSEND_SENDER_NAME="${mailersendSenderName}"`)
    await writeFile(envTestPath, envTestContent)
  }

  // Update deployment.yml with MailerSend env vars (if file exists)
  const deploymentYmlPath = `${apiPath}/.github/workflows/deployment.yml`
  if (await fileExists(deploymentYmlPath)) {
    let deploymentYmlContent = await readFile(deploymentYmlPath, 'utf8')
    deploymentYmlContent = deploymentYmlContent
      .replace(/# MAILERSEND_API_KEY=.*$/m, `MAILERSEND_API_KEY=\\"\${{ secrets.MAILERSEND_API_KEY }}\\"`)
      .replace(/# MAILERSEND_SENDER_EMAIL=.*$/m, `MAILERSEND_SENDER_EMAIL=\\"${mailersendSenderEmail}\\"`)
      .replace(/# MAILERSEND_SENDER_NAME=.*$/m, `MAILERSEND_SENDER_NAME=\\"${mailersendSenderName}\\"`)
    await writeFile(deploymentYmlPath, deploymentYmlContent)
  }
}
