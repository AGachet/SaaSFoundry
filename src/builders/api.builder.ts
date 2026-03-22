import { copy } from 'fs-extra'
import { readFile, rm, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { exec } from 'shelljs'

import { installEmailModule } from '../installers/email.installer'
import { installStorageModule } from '../installers/storage.installer'
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
  else {
    await copy(resolve(overlaysPath, 'monorepo/api'), apiPath, { overwrite: true })
    // Remove per-app CI workflows (monorepo uses root-level workflows)
    await rm(`${apiPath}/.github`, { recursive: true, force: true })
    // Point ESLint custom rule to monorepo root shared file
    const eslintConfigPath = `${apiPath}/eslint.config.mjs`
    let eslintConfig = await readFile(eslintConfigPath, 'utf8')
    eslintConfig = eslintConfig.replace(`'./eslint-rules/no-version-prefix.mjs'`, `'../../eslint-rules/no-version-prefix.mjs'`)
    await writeFile(eslintConfigPath, eslintConfig)
  }

  // Update package.json
  const packageJsonPath = `${apiPath}/package.json`
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  packageJson.name = `${projectName}-api`
  packageJson.description = projectDescription
  packageJson.repository.url = backendRepoUrl || 'https://github.com/agachet/saasfoundry.git'
  packageJson.keywords = [projectName, 'saasfoundry', 'backend', 'nest', 'prisma']
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
  const nvm = getNvmPrefix()

  // For monorepo, npm install and prisma generate are handled by the monorepo root builder
  if (!isMonorepo) {
    await exec(`${nvm}npm install --prefix ${apiPath} > /dev/null 2>&1`)
    await exec(`${nvm}cd ${apiPath} && npx prisma generate > /dev/null 2>&1`)
  }

  // Update .env with core settings (JWT secrets, database credentials)
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

  // Write core .env changes before module installers run
  await writeFile(envPath, envContent)

  // Install MailerSend email module (if selected)
  if (emailService === 'mailersend') {
    await installEmailModule({
      apiPath,
      mailersendApiKey: mailersendApiKey || '',
      mailersendSenderEmail: mailersendSenderEmail || '',
      mailersendSenderName: mailersendSenderName || ''
    })
  }

  // Install S3 storage module (if selected)
  if (s3Setup !== 'manual') {
    const webPath = isMonorepo ? 'apps/web' : `apps/${projectName}-web`
    await installStorageModule({
      apiPath,
      webPath,
      isMonorepo,
      projectName,
      s3Setup,
      s3Credentials
    })
  }

  // Update Docker network name in docker-compose.yml
  const dockerComposePath = `${apiPath}/docker-compose.yml`
  if (await fileExists(dockerComposePath)) {
    let dockerComposeContent = await readFile(dockerComposePath, 'utf8')
    dockerComposeContent = dockerComposeContent.replace(/saasfoundry-network/g, `${projectName}-network`).replace(/saasfoundry-api/g, `${projectName}-api`)
    await writeFile(dockerComposePath, dockerComposeContent)
  }

  // Update Docker Compose project name and container names in docker-compose.db-test.yml
  const dbTestComposePath = `${apiPath}/docker-compose.db-test.yml`
  if (await fileExists(dbTestComposePath)) {
    let dbTestContent = await readFile(dbTestComposePath, 'utf8')
    dbTestContent = dbTestContent.replace(/saasfoundry-db-test/g, `${projectName}-db-test`)
    await writeFile(dbTestComposePath, dbTestContent)
  }

  // Update network name in GitHub Actions deployment.yml
  const deploymentYmlPath = `${apiPath}/.github/workflows/deployment.yml`
  if (await fileExists(deploymentYmlPath)) {
    let deploymentYmlContent = await readFile(deploymentYmlPath, 'utf8')
    deploymentYmlContent = deploymentYmlContent.replace(/saasfoundry-network/g, `${projectName}-network`)
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
