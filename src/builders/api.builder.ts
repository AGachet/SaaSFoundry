import { copy } from 'fs-extra'
import { readFile, rename, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { exec } from 'shelljs'

import { blueprintsPath, CreateApiAppParams, overlaysPath } from '../types'
import { fileExists, generateJwtSecret, getNvmPrefix, validateProjectName } from '../utils'

export async function createApiApp({
  isMonorepo,
  projectName,
  projectDescription,
  backendRepoUrl,
  dbCredentials,
  mainBranch,
  emailService,
  mailersendApiKey,
  mailersendSenderEmail,
  mailersendSenderName,
  s3Setup,
  s3Credentials
}: CreateApiAppParams) {
  validateProjectName(projectName)

  // Create the API app directory
  const apiPath = isMonorepo ? 'apps/api' : `apps/${projectName}-api`

  await copy(resolve(blueprintsPath, 'api'), apiPath)
  if (!isMonorepo) await copy(resolve(overlaysPath, 'multirepo/api'), apiPath, { overwrite: true })
  else await copy(resolve(overlaysPath, 'monorepo/api'), apiPath, { overwrite: true })

  // Update package.json
  const packageJsonPath = `${apiPath}/package.json`
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  packageJson.name = `${projectName}-api`
  packageJson.description = projectDescription
  packageJson.repository.url = backendRepoUrl || 'https://github.com/agachet/saasfoundry.git'
  packageJson.keywords = [projectName, 'saasfoundry', 'backend', 'nest', 'prisma']
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
  const nvm = getNvmPrefix()
  await exec(`${nvm}npm install --prefix ${apiPath} > /dev/null 2>&1`)
  await exec(`${nvm}cd ${apiPath} && npx prisma generate > /dev/null 2>&1`)

  // Update .env
  const envPath = `${apiPath}/.env`
  let envContent = await readFile(envPath, 'utf8')

  // Generate JWT secrets
  const jwtSecrets = {
    auth: generateJwtSecret(),
    refresh: generateJwtSecret(),
    invitation: generateJwtSecret(),
    confirmAccount: generateJwtSecret(),
    resetPassword: generateJwtSecret()
  }

  // Update JWT secrets in .env
  envContent = envContent
    .replace(/JWT_SECRET_AUTH=.*$/m, `JWT_SECRET_AUTH="${jwtSecrets.auth}"`)
    .replace(/JWT_SECRET_REFRESH=.*$/m, `JWT_SECRET_REFRESH="${jwtSecrets.refresh}"`)
    .replace(/JWT_SECRET_INVITATION=.*$/m, `JWT_SECRET_INVITATION="${jwtSecrets.invitation}"`)
    .replace(/JWT_SECRET_CONFIRM_ACCOUNT=.*$/m, `JWT_SECRET_CONFIRM_ACCOUNT="${jwtSecrets.confirmAccount}"`)
    .replace(/JWT_SECRET_RESET_PASSWORD=.*$/m, `JWT_SECRET_RESET_PASSWORD="${jwtSecrets.resetPassword}"`)

  // Update email templates with project name
  const enLocalePath = `${apiPath}/src/modules/email/locales/en.ts`
  const frLocalePath = `${apiPath}/src/modules/email/locales/fr.ts`

  if (await fileExists(enLocalePath)) {
    let enLocaleContent = await readFile(enLocalePath, 'utf8')
    enLocaleContent = enLocaleContent.replace(/SaaSFoundry/g, projectName.toUpperCase())
    await writeFile(enLocalePath, enLocaleContent)
  }

  if (await fileExists(frLocalePath)) {
    let frLocaleContent = await readFile(frLocalePath, 'utf8')
    frLocaleContent = frLocaleContent.replace(/SaaSFoundry/g, projectName.toUpperCase())
    await writeFile(frLocalePath, frLocaleContent)
  }

  // Update database credentials if provided
  if (dbCredentials) {
    const { host, port, user, password, database, dbType } = dbCredentials
    envContent = envContent
      .replace(/DATABASE_URL=.*$/m, `DATABASE_URL="${dbType}://${user}:${password}@${host}:${port}/${database}"`)
      .replace(/DIRECT_URL=.*$/m, `DIRECT_URL="${dbType}://${user}:${password}@${host}:${port}/${database}"`)
  }

  // Update MailerSend configuration if selected
  if (emailService === 'mailersend') {
    // Copy MailerSend service to the API email services directory
    const mailerSendServicePath = resolve(overlaysPath, 'modules/email/services/mailersend.service.ts')
    const apiServicesPath = `${apiPath}/src/modules/email/services`
    await copy(mailerSendServicePath, `${apiServicesPath}/mailersend.service.ts`)

    // Uncomment email sending code in auth.service.ts and env.service.ts
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
    envContent = envContent
      .replace(/# MAILERSEND_API_KEY=.*$/m, `MAILERSEND_API_KEY="${mailersendApiKey}"`)
      .replace(/# MAILERSEND_SENDER_EMAIL=.*$/m, `MAILERSEND_SENDER_EMAIL="${mailersendSenderEmail}"`)
      .replace(/# MAILERSEND_SENDER_NAME=.*$/m, `MAILERSEND_SENDER_NAME="${mailersendSenderName}"`)

    // Update .env.test
    const envTestPath = `${apiPath}/.env.test`
    let envTestContent = await readFile(envTestPath, 'utf8')
    envTestContent = envTestContent
      .replace(/# MAILERSEND_API_KEY=.*$/m, `MAILERSEND_API_KEY="ms_test_fake_key_12345abcdef67890ghijklmnopqrstuvwxyz"`)
      .replace(/# MAILERSEND_SENDER_EMAIL=.*$/m, `MAILERSEND_SENDER_EMAIL="${mailersendSenderEmail}"`)
      .replace(/# MAILERSEND_SENDER_NAME=.*$/m, `MAILERSEND_SENDER_NAME="${mailersendSenderName}"`)
    await writeFile(envTestPath, envTestContent)
  }

  // Update S3 storage configuration if selected
  if (s3Setup !== 'manual') {
    // Copy storage overlay module to the API
    const storageOverlayPath = resolve(overlaysPath, 'modules/storage')
    const apiStoragePath = `${apiPath}/src/modules/storage`
    await copy(storageOverlayPath, apiStoragePath)

    // Add @aws-sdk/client-s3 dependency and @types/multer for file uploads
    const pkgPath = `${apiPath}/package.json`
    const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
    pkg.dependencies['@aws-sdk/client-s3'] = '3.750.0'
    pkg.devDependencies['@types/multer'] = '2.0.0'
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2))
    await exec(`${nvm}npm install --prefix ${apiPath} > /dev/null 2>&1`)

    // Uncomment storage configuration in env.service.ts
    const envServicePath = `${apiPath}/src/configs/env/services/env.service.ts`
    let envServiceContent = await readFile(envServicePath, 'utf8')
    envServiceContent = envServiceContent.replace(/\/\/ TODO storage-service-active: /g, '')
    await writeFile(envServicePath, envServiceContent)

    // Uncomment storage imports in app.module.ts
    const appModulePath = `${apiPath}/src/app.module.ts`
    let appModuleContent = await readFile(appModulePath, 'utf8')
    appModuleContent = appModuleContent.replace(/\/\/ TODO storage-service-active: /g, '')
    await writeFile(appModulePath, appModuleContent)

    // Uncomment storage imports in organizations.module.ts
    const orgModulePath = `${apiPath}/src/modules/organizations/organizations.module.ts`
    let orgModuleContent = await readFile(orgModulePath, 'utf8')
    orgModuleContent = orgModuleContent.replace(/\/\/ TODO storage-service-active: /g, '')
    await writeFile(orgModulePath, orgModuleContent)

    // Uncomment storage code in organization.controller.ts
    const orgControllerPath = `${apiPath}/src/modules/organizations/controllers/organization.controller.ts`
    let orgControllerContent = await readFile(orgControllerPath, 'utf8')
    orgControllerContent = orgControllerContent.replace(/\/\/ TODO storage-service-active: /g, '')
    await writeFile(orgControllerPath, orgControllerContent)

    // Uncomment storage code in organization.service.ts
    const orgServicePath = `${apiPath}/src/modules/organizations/services/organization.service.ts`
    let orgServiceContent = await readFile(orgServicePath, 'utf8')
    orgServiceContent = orgServiceContent.replace(/\/\/ TODO storage-service-active: /g, '')
    await writeFile(orgServicePath, orgServiceContent)

    // Determine S3 credentials
    const s3Endpoint = s3Setup === 'docker' ? 'http://localhost:9000' : s3Credentials?.endpoint || ''
    const s3AccessKey = s3Setup === 'docker' ? 'minioadmin' : s3Credentials?.accessKey || ''
    const s3SecretKey = s3Setup === 'docker' ? 'minioadmin' : s3Credentials?.secretKey || ''
    const s3Bucket = s3Credentials?.bucket || `${projectName}-uploads`
    const s3Region = s3Credentials?.region || 'us-east-1'

    // Update .env with S3 credentials
    envContent = envContent
      .replace(/# S3_ENDPOINT=.*$/m, `S3_ENDPOINT="${s3Endpoint}"`)
      .replace(/# S3_ACCESS_KEY=.*$/m, `S3_ACCESS_KEY="${s3AccessKey}"`)
      .replace(/# S3_SECRET_KEY=.*$/m, `S3_SECRET_KEY="${s3SecretKey}"`)
      .replace(/# S3_BUCKET=.*$/m, `S3_BUCKET="${s3Bucket}"`)
      .replace(/# S3_REGION=.*$/m, `S3_REGION="${s3Region}"`)

    // Update .env.test with S3 test credentials
    const envTestPath = `${apiPath}/.env.test`
    let envTestContent = await readFile(envTestPath, 'utf8')
    envTestContent = envTestContent
      .replace(/# S3_ENDPOINT=.*$/m, `S3_ENDPOINT="http://localhost:9000"`)
      .replace(/# S3_ACCESS_KEY=.*$/m, `S3_ACCESS_KEY="minioadmin"`)
      .replace(/# S3_SECRET_KEY=.*$/m, `S3_SECRET_KEY="minioadmin"`)
      .replace(/# S3_BUCKET=.*$/m, `S3_BUCKET="test-uploads"`)
      .replace(/# S3_REGION=.*$/m, `S3_REGION="us-east-1"`)
    await writeFile(envTestPath, envTestContent)
  }

  await writeFile(envPath, envContent)

  // Update Docker network name in docker-compose.yml
  const dockerComposePath = `${apiPath}/docker-compose.yml`
  if (await fileExists(dockerComposePath)) {
    let dockerComposeContent = await readFile(dockerComposePath, 'utf8')
    dockerComposeContent = dockerComposeContent.replace(/saasfoundry-network/g, `${projectName}-network`).replace(/saasfoundry-api/g, `${projectName}-api`)
    await writeFile(dockerComposePath, dockerComposeContent)
  }

  // Update network name (and MailerSend config if applicable) in GitHub Actions deployment.yml
  const deploymentYmlPath = `${apiPath}/.github/workflows/deployment.yml`
  if (await fileExists(deploymentYmlPath)) {
    let deploymentYmlContent = await readFile(deploymentYmlPath, 'utf8')
    deploymentYmlContent = deploymentYmlContent.replace(/saasfoundry-network/g, `${projectName}-network`)
    if (emailService === 'mailersend') {
      deploymentYmlContent = deploymentYmlContent
        .replace(/# MAILERSEND_API_KEY=.*$/m, `MAILERSEND_API_KEY=\\"\${{ secrets.MAILERSEND_API_KEY }}\\"`)
        .replace(/# MAILERSEND_SENDER_EMAIL=.*$/m, `MAILERSEND_SENDER_EMAIL=\\"${mailersendSenderEmail}\\"`)
        .replace(/# MAILERSEND_SENDER_NAME=.*$/m, `MAILERSEND_SENDER_NAME=\\"${mailersendSenderName}\\"`)
    }
    await writeFile(deploymentYmlPath, deploymentYmlContent)
  }

  // Initialize Git repository
  if (!isMonorepo) {
    await exec(`git init ${apiPath} > /dev/null 2>&1`)
    await exec(`git -C ${apiPath} checkout -b ${mainBranch} > /dev/null 2>&1`)
    if (backendRepoUrl) await exec(`git -C ${apiPath} remote add origin ${backendRepoUrl} > /dev/null 2>&1`)
    await exec(`git -C ${apiPath} add . > /dev/null 2>&1`)
    await exec(`git -C ${apiPath} commit -m "Initial commit" > /dev/null 2>&1`)
  }

  return true
}
