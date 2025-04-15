import chalk from 'chalk'
import crypto from 'crypto'
import fs from 'fs'
import { copy } from 'fs-extra'
import { mkdir, readFile, rename, writeFile } from 'fs/promises'
import inquirer from 'inquirer'
import ora from 'ora'
import { resolve } from 'path'
import { exec } from 'shelljs'

/**
 * Types
 */
interface DbCredentials {
  host: string
  port: string
  user: string
  password: string
  database: string
  dbType: 'postgresql' | 'sql'
}

interface Answers {
  projectName: string
  projectDescription: string
  isMonorepo: boolean
  setupRepo: 'local' | 'create' | 'existing'
  gitProvider?: 'GitHub' | 'GitLab'
  mainBranch: 'main' | 'master'
  monorepoUrl?: string
  backendRepoUrl: string
  frontendRepoUrl?: string
  dbSetup: 'docker' | 'credentials' | 'manual'
  dbCredentials?: DbCredentials
  initDb: boolean
  emailService: 'none' | 'mailersend'
  mailersendApiKey?: string
  mailersendSenderEmail?: string
  mailersendSenderName?: string
}

interface CreateApiAppParams {
  isMonorepo: boolean
  projectName: string
  projectDescription: string
  backendRepoUrl: string
  dbCredentials?: DbCredentials
  mainBranch: string
  emailService: 'none' | 'mailersend'
  mailersendApiKey?: string
  mailersendSenderEmail?: string
  mailersendSenderName?: string
}

interface CreateWebAppParams {
  isMonorepo: boolean
  projectName: string
  projectDescription: string
  frontendRepoUrl: string
  mainBranch: string
}

interface CreateDbAppParams {
  isMonorepo: boolean
  projectName: string
  dbCredentials?: DbCredentials
}

// Paths
const blueprintsPath = resolve(__dirname, '../../scaffolds/blueprints')
const overlaysPath = resolve(__dirname, '../../scaffolds/overlays')

/**
 * Generate a secure random string for JWT secrets
 * @param length Length of the secret (default: 64)
 * @returns A secure random string
 */
function generateJwtSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Set default values for database credentials if they are empty
 */
function setDefaultDbCredentials(credentials?: DbCredentials): DbCredentials | undefined {
  if (!credentials) return undefined

  // define db type first
  const dbType = credentials.dbType || 'postgresql'

  return {
    dbType,
    host: credentials.host || 'localhost',
    port: credentials.port || (dbType === 'postgresql' ? '5435' : '1433'),
    user: credentials.user || 'db_dev_user',
    password: credentials.password || 'db_dev_password',
    database: credentials.database || 'db_dev'
  }
}

/**
 * Get user inputs
 */
async function getUserStartProjectInputs() {
  const answers = await inquirer.prompt<Answers>([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is the name of your project?',
      validate: (input: string) => {
        if (!input) return 'Project name is required'
        if (!/^[a-z0-9-]+$/.test(input)) {
          return 'Project name can only contain lowercase letters, numbers, and hyphens'
        }
        return true
      }
    },
    {
      type: 'input',
      name: 'projectDescription',
      message: 'What is the description of your project?',
      default: (answers: Answers) => `${answers.projectName} is just an amazing SaaSFoundry project`
    },
    {
      type: 'list',
      name: 'mainBranch',
      message: 'Which main branch name do you prefer?',
      choices: [
        { name: 'main', value: 'main' },
        { name: 'master', value: 'master' }
      ],
      default: 'main'
    },
    {
      type: 'list',
      name: 'isMonorepo',
      message: 'How would you like to structure your project?',
      choices: [
        { name: 'Monorepo: Single Git repository for Backend and Frontend (centralized management) - Coming soon', value: true, disabled: true },
        { name: 'Multirepo: Separate Git repositories for Backend and Frontend (independent management)', value: false }
      ],
      default: false
    },
    {
      type: 'list',
      name: 'setupRepo',
      message: 'Do you have already a remote repository?',
      choices: [
        { name: 'Not yet, just setup on local', value: 'local' },
        { name: "Yes, I'll give you the link", value: 'existing' }
      ],
      when: (answers: Answers) => answers.isMonorepo
    },
    {
      type: 'list',
      name: 'setupRepo',
      message: 'Do you have already remote repositories?',
      choices: [
        { name: 'Not yet, just setup on local for both', value: 'local' },
        { name: "Yes, I'll give you the links", value: 'existing' }
      ],
      when: (answers: Answers) => !answers.isMonorepo
    },
    {
      type: 'input',
      name: 'monorepoUrl',
      message: 'Enter your existing monorepo Git URL',
      when: (answers: Answers) => answers.isMonorepo && answers.setupRepo === 'existing',
      validate: (input: string) => {
        if (!input) return 'Git URL is required'
        return true
      }
    },
    {
      type: 'input',
      name: 'backendRepoUrl',
      message: 'Enter your existing backend Git URL',
      when: (answers: Answers) => !answers.isMonorepo && answers.setupRepo === 'existing',
      validate: (input: string) => {
        if (!input) return 'Backend Git URL is required'
        return true
      },
      default: 'https://github.com/agachet/saasfoundry'
    },
    {
      type: 'input',
      name: 'frontendRepoUrl',
      message: 'Enter your existing frontend Git URL',
      when: (answers: Answers) => !answers.isMonorepo && answers.setupRepo === 'existing',
      validate: (input: string) => {
        if (!input) return 'Frontend Git URL is required'
        return true
      },
      default: 'https://github.com/agachet/saasfoundry'
    },
    {
      type: 'list',
      name: 'dbSetup',
      message: 'Do you want to set up a development database with Docker? (you must have docker installed)',
      choices: [
        {
          name: 'Yes (create a docker-compose.db.yml file)',
          value: 'docker'
        },
        {
          name: "No, let's just connect api to my db following these credentials",
          value: 'credentials'
        },
        { name: "No I'll do it later", value: 'manual' }
      ]
    },
    {
      type: 'list',
      name: 'dbCredentials.dbType',
      message: 'Which database technology are you using?',
      choices: [
        { name: 'PostgreSQL', value: 'postgresql' },
        { name: 'SQL Server', value: 'sql' }
      ],
      when: (answers: Answers) => answers.dbSetup === 'credentials',
      default: 'postgresql'
    },
    {
      type: 'input',
      name: 'dbCredentials.host',
      message: 'Database host',
      when: (answers: Answers) => answers.dbSetup === 'credentials'
    },
    {
      type: 'input',
      name: 'dbCredentials.port',
      message: 'Database port',
      when: (answers: Answers) => answers.dbSetup === 'credentials'
    },
    {
      type: 'input',
      name: 'dbCredentials.user',
      message: 'Database user',
      when: (answers: Answers) => answers.dbSetup === 'docker' || answers.dbSetup === 'credentials',
      default: 'db_dev_user'
    },
    {
      type: 'input',
      name: 'dbCredentials.password',
      message: 'Database password',
      when: (answers: Answers) => answers.dbSetup === 'docker' || answers.dbSetup === 'credentials',
      default: 'db_dev_password'
    },
    {
      type: 'input',
      name: 'dbCredentials.database',
      message: 'Database name',
      when: (answers: Answers) => answers.dbSetup === 'docker' || answers.dbSetup === 'credentials',
      default: 'db_dev'
    },
    {
      type: 'list',
      name: 'emailService',
      message: 'For your transactional emails (account creation, password reset, etc.), which service would you like to set up?',
      choices: [
        { name: 'None, just set up the logic', value: 'none' },
        { name: 'MailerSend [free, 3000 emails/month]', value: 'mailersend' }
      ],
      default: 'mailersend'
    }
  ])

  if (answers.emailService === 'mailersend') {
    console.log(chalk.yellow('\nYou need to create an account on MailerSend to get your API key.'))
    console.log(chalk.yellow('Note: The following link is an affiliate link. We appreciate your support of the SaaSFoundry project by signing up through this link.'))
    console.log(chalk.yellow('Opening https://www.mailersend.com?ref=52o9lkySkTka in your browser in few seconds...'))

    // Wait a few seconds before opening the URL
    await new Promise((resolve) => setTimeout(resolve, 4000))

    // Open the URL in the default browser
    await exec(`open https://www.mailersend.com/signup?ref=52o9lkySkTka`)

    const { ready } = await inquirer.prompt<{ ready: boolean }>([
      {
        type: 'confirm',
        name: 'ready',
        message: 'Are you ready to configure your MailerSend credentials?',
        default: true
      }
    ])

    if (ready) {
      const mailerSendAnswers = await inquirer.prompt<Answers>([
        {
          type: 'input',
          name: 'mailersendApiKey',
          message: 'Enter your MailerSend API key',
          validate: (input: string) => {
            if (!input) return 'API key is required'
            return true
          }
        },
        {
          type: 'input',
          name: 'mailersendSenderEmail',
          message: 'Enter your MailerSend sender email',
          default: `noreply@${answers.projectName.toLowerCase().replace(/\s+/g, '')}.com`,
          validate: (input: string) => {
            if (!input) return 'Sender email is required'
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return 'Please enter a valid email address'
            return true
          }
        },
        {
          type: 'input',
          name: 'mailersendSenderName',
          message: 'Enter your MailerSend sender name',
          default: answers.projectName.charAt(0).toUpperCase() + answers.projectName.slice(1),
          validate: (input: string) => {
            if (!input) return 'Sender name is required'
            return true
          }
        }
      ])

      return { ...answers, ...mailerSendAnswers }
    } else {
      console.log(chalk.yellow('\nThe email service logic will be set up but disabled until you implement your own service.'))
    }
  }

  return answers
}

/**
 * Step functions
 */
async function createApiApp({
  isMonorepo,
  projectName,
  projectDescription,
  backendRepoUrl,
  dbCredentials,
  mainBranch,
  emailService,
  mailersendApiKey,
  mailersendSenderEmail,
  mailersendSenderName
}: CreateApiAppParams) {
  try {
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
    await exec(`npm install --prefix ${apiPath} > /dev/null 2>&1`)

    // Update .env
    const envPath = `${apiPath}/.env`
    let envContent = await readFile(envPath, 'utf8')

    // Generate JWT secrets
    const jwtSecrets = {
      auth: generateJwtSecret(),
      refresh: generateJwtSecret(),
      confirmAccount: generateJwtSecret(),
      resetPassword: generateJwtSecret()
    }

    // Update JWT secrets in .env
    envContent = envContent
      .replace(/JWT_SECRET_AUTH=.*$/m, `JWT_SECRET_AUTH="${jwtSecrets.auth}"`)
      .replace(/JWT_SECRET_REFRESH=.*$/m, `JWT_SECRET_REFRESH="${jwtSecrets.refresh}"`)
      .replace(/JWT_SECRET_CONFIRM_ACCOUNT=.*$/m, `JWT_SECRET_CONFIRM_ACCOUNT="${jwtSecrets.confirmAccount}"`)
      .replace(/JWT_SECRET_RESET_PASSWORD=.*$/m, `JWT_SECRET_RESET_PASSWORD="${jwtSecrets.resetPassword}"`)

    // Update email templates with project name
    const enLocalePath = `${apiPath}/src/modules/email/locales/en.ts`
    const frLocalePath = `${apiPath}/src/modules/email/locales/fr.ts`

    if (await fileExists(enLocalePath)) {
      let enLocaleContent = await readFile(enLocalePath, 'utf8')
      enLocaleContent = enLocaleContent.replace(/BillMate/g, projectName.toUpperCase())
      await writeFile(enLocalePath, enLocaleContent)
    }

    if (await fileExists(frLocalePath)) {
      let frLocaleContent = await readFile(frLocalePath, 'utf8')
      frLocaleContent = frLocaleContent.replace(/BillMate/g, projectName.toUpperCase())
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

      // Uncomment email configuration in env.service.ts
      const envServicePath = `${apiPath}/src/configs/env/services/env.service.ts`
      let envServiceContent = await readFile(envServicePath, 'utf8')
      envServiceContent = envServiceContent.replace(/\/\/ TODO mailer-service-active: /g, '')
      await writeFile(envServicePath, envServiceContent)

      // Uncomment email sending code in email.service.ts
      const emailServicePath = `${apiPath}/src/modules/email/services/email.service.ts`
      let emailServiceContent = await readFile(emailServicePath, 'utf8')
      emailServiceContent = emailServiceContent
        .replace(/\/\/ /g, '')
        .replace(/console\.log\('html', html\)\n/g, '')
        .replace(/console\.log\('text', text\)\n/g, '')
      await writeFile(emailServicePath, emailServiceContent)

      // Update email.module.ts to include MailerSendService
      const emailModulePath = `${apiPath}/src/modules/email/email.module.ts`
      let emailModuleContent = await readFile(emailModulePath, 'utf8')

      // Add import for MailerSendService
      emailModuleContent = emailModuleContent.replace(
        /import { TranslationService } from '@modules\/email\/services\/translation.service'/,
        `import { TranslationService } from '@modules/email/services/translation.service'\nimport { MailerSendService } from '@modules/email/services/mailersend.service'`
      )

      // Add MailerSendService to providers array
      emailModuleContent = emailModuleContent.replace(/providers: \[EmailService, EnvConfig, TranslationService\]/, `providers: [EmailService, EnvConfig, TranslationService, MailerSendService]`)

      await writeFile(emailModulePath, emailModuleContent)

      // Rename email.service.disabled-spec.ts to email.service.spec.ts
      const emailServiceSpecPath = `${apiPath}/src/modules/email/tests/unit/email.service.disabled-spec.ts`
      const emailServiceSpecNewPath = `${apiPath}/src/modules/email/tests/unit/email.service.spec.ts`
      if (await fileExists(emailServiceSpecPath)) await rename(emailServiceSpecPath, emailServiceSpecNewPath)

      // Update deployment.yml to uncomment MailerSend configuration
      const deploymentYmlPath = `${apiPath}/.github/workflows/deployment.yml`
      if (await fileExists(deploymentYmlPath)) {
        let deploymentYmlContent = await readFile(deploymentYmlPath, 'utf8')
        deploymentYmlContent = deploymentYmlContent
          .replace(/# MAILERSEND_API_KEY=.*$/m, `MAILERSEND_API_KEY=\\"\${{ secrets.MAILERSEND_API_KEY }}\\"`)
          .replace(/# MAILERSEND_SENDER_EMAIL=.*$/m, `MAILERSEND_SENDER_EMAIL=\\"${mailersendSenderEmail}\\"`)
          .replace(/# MAILERSEND_SENDER_NAME=.*$/m, `MAILERSEND_SENDER_NAME=\\"${mailersendSenderName}\\"`)
        await writeFile(deploymentYmlPath, deploymentYmlContent)
      }

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

    await writeFile(envPath, envContent)

    // Update Docker network name in docker-compose.yml
    const dockerComposePath = `${apiPath}/docker-compose.yml`
    if (await fileExists(dockerComposePath)) {
      let dockerComposeContent = await readFile(dockerComposePath, 'utf8')
      dockerComposeContent = dockerComposeContent.replace(/saasfoundry-network/g, `${projectName}-network`).replace(/saasfoundry-api/g, `${projectName}-api`)
      await writeFile(dockerComposePath, dockerComposeContent)
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
  } catch (error) {
    throw error
  }
}

async function createDbApp({ isMonorepo, projectName, dbCredentials }: CreateDbAppParams) {
  try {
    // Copy the DB app directory
    const dbPath = isMonorepo ? 'apps/db' : `apps/${projectName}-db`
    await copy(resolve(blueprintsPath, 'db'), dbPath)

    // Update DB credentials
    const templatePath = resolve(blueprintsPath, 'db/docker-compose.db.yml')
    const templateContent = await readFile(templatePath, 'utf8')

    const { user, password, database } = dbCredentials || {
      user: 'db_dev_user',
      password: 'db_dev_password',
      database: 'db_dev'
    }

    const customizedContent = templateContent
      .replace(/container_name:.*$/m, `container_name: ${projectName}-db-dev`)
      .replace(/POSTGRES_USER:.*$/m, `POSTGRES_USER: ${user}`)
      .replace(/POSTGRES_PASSWORD:.*$/m, `POSTGRES_PASSWORD: ${password}`)
      .replace(/POSTGRES_DB:.*$/m, `POSTGRES_DB: ${database}`)
      .replace(/test: \[.*\]/m, `test: ['CMD-SHELL', 'pg_isready -U ${user} -d ${database}']`)
      .replace(/saasfoundry-network/g, `${projectName}-network`)

    await writeFile(`${dbPath}/docker-compose.db.yml`, customizedContent)

    return true
  } catch (error) {
    throw error
  }
}

async function createWebApp({ isMonorepo, projectName, projectDescription, frontendRepoUrl, mainBranch }: CreateWebAppParams) {
  try {
    // Create the WEB app directory
    const webPath = isMonorepo ? 'apps/web' : `apps/${projectName}-web`

    await copy(resolve(blueprintsPath, 'web'), webPath)
    if (!isMonorepo) await copy(resolve(overlaysPath, 'multirepo/web'), webPath, { overwrite: true })
    else await copy(resolve(overlaysPath, 'monorepo/web'), webPath, { overwrite: true })

    // Update package.json
    const packageJsonPath = `${webPath}/package.json`
    const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
    packageJson.name = `${projectName}-api`
    packageJson.description = projectDescription
    packageJson.repository.url = frontendRepoUrl || 'https://github.com/agachet/saasfoundry.git'
    packageJson.keywords = [projectName, 'saasfoundry', 'backend', 'nest', 'prisma']
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
    await exec(`npm install --prefix ${webPath} > /dev/null 2>&1`)

    // Update Docker network name in docker-compose.yml
    const dockerComposePath = `${webPath}/docker-compose.yml`
    if (await fileExists(dockerComposePath)) {
      let dockerComposeContent = await readFile(dockerComposePath, 'utf8')
      dockerComposeContent = dockerComposeContent.replace(/saasfoundry-network/g, `${projectName}-network`).replace(/saasfoundry-web/g, `${projectName}-web`)
      await writeFile(dockerComposePath, dockerComposeContent)
    }

    // Initialize Git repository
    if (!isMonorepo) {
      await exec(`git init ${webPath} > /dev/null 2>&1`)
      await exec(`git -C ${webPath} checkout -b ${mainBranch} > /dev/null 2>&1`)
      if (frontendRepoUrl) await exec(`git -C ${webPath} remote add origin ${frontendRepoUrl} > /dev/null 2>&1`)
      await exec(`git -C ${webPath} add . > /dev/null 2>&1`)
      await exec(`git -C ${webPath} commit -m "Initial commit" > /dev/null 2>&1`)
    }

    return true
  } catch (error) {
    throw error
  }
}

async function initAndStartDb(projectName: string, dbSetup: 'docker' | 'credentials' | 'manual', isMonorepo: boolean, spinner: ReturnType<typeof ora>) {
  try {
    spinner.text = 'Initializing and starting database...'

    if (dbSetup === 'docker') {
      // Create network if it doesn't exist
      await exec(`docker network create ${projectName}-network > /dev/null 2>&1 || true`)
      // Start the database
      const dbPath = isMonorepo ? 'apps/db' : `apps/${projectName}-db`
      await exec(`docker-compose -f ${dbPath}/docker-compose.db.yml up -d > /dev/null 2>&1`)
    }

    // Initialize the database with required configurations
    spinner.text = 'Configuring database...'
    const apiPath = isMonorepo ? 'apps/api' : `apps/${projectName}-api`
    await exec(`npm run db:update:dev init_data_base_config --prefix ${apiPath} -- --wf --wt --wds 2> /dev/null || npm run db:update:dev init_data_base_config --prefix ${apiPath} -- --wf --wt --wds`)

    return true
  } catch (error) {
    throw error
  }
}

/**
 * Waits for a server to be ready by checking its health endpoint
 * @param url The health endpoint URL to check
 * @param timeout Maximum time to wait in milliseconds
 * @returns Promise that resolves when the server is ready
 */
async function waitForServer(url: string, timeout: number = 30000): Promise<void> {
  const startTime = Date.now()
  const checkInterval = 1000 // Check every second

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Server not ready yet, continue waiting
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval))
  }

  throw new Error(`Server at ${url} did not become ready within ${timeout}ms`)
}

/**
 * Opens a new terminal tab or window with contextual directory and optional command
 * @param directory The directory to open the terminal in
 * @param command Optional command to run after changing to the directory
 * @param description Description for the spinner (e.g., "Opening terminal..." or "Starting backend...")
 * @returns Promise<boolean> indicating success or failure
 */
async function openTerminal(directory: string, options?: { command?: string; description?: string }): Promise<boolean> {
  const { command, description } = options || {}
  const spinnerText = description || (command ? `Running command in terminal...` : `Opening terminal...`)
  const spinner = ora(spinnerText).start()

  try {
    // Get the absolute path
    const absolutePath = `${process.cwd()}/${directory}`
    let success = false

    // Check if we're in WSL
    const isWsl = process.platform === 'linux' && process.env.WSL_DISTRO_NAME
    const platform = isWsl ? 'wsl' : process.platform

    // Use different commands based on the operating system
    switch (platform) {
      case 'darwin': {
        // macOS - try iTerm2 first, then fallback to Terminal.app
        try {
          // Check if iTerm2 is installed
          await exec('osascript -e "tell application \\"iTerm\\" to version"', { silent: true })

          // iTerm2 is installed, use a more permissive approach for new tab
          const script = `
          tell application "iTerm"
            tell current window
              create tab with default profile
              tell current session
                write text "cd ${absolutePath}${command ? ` && ${command}` : ''}"
              end tell
            end tell
          end tell
        `
          await exec(`osascript -e '${script}'`)
          success = true
        } catch {
          // iTerm2 not found or error, use Terminal.app
          await exec(
            `osascript -e 'tell application "Terminal" to tell application "System Events" to keystroke "t" using {command down}' -e 'tell application "Terminal" to do script "cd ${absolutePath}${command ? ` && ${command}` : ''}" in front window'`
          )
          success = true
        }
        break
      }
      case 'win32': {
        // Windows - check for Windows Terminal
        const hasWindowsTerminal = (await exec('where wt.exe', { silent: true }).code) === 0

        if (hasWindowsTerminal) {
          // Windows Terminal
          if (command) {
            await exec(`wt.exe -w 0 nt -d "${absolutePath}" cmd /k ${command}`)
          } else {
            await exec(`wt.exe -w 0 nt -d "${absolutePath}"`)
          }
          success = true
        } else {
          // Fallback to cmd
          await exec(`start cmd.exe /K "cd ${absolutePath}${command ? ` && ${command}` : ''}"`)
          success = true
        }
        break
      }
      case 'wsl': {
        // WSL - use the default shell
        if (command) await exec(`cd ${absolutePath} && ${command}`)
        else await exec(`cd ${absolutePath}`)
        success = true
        break
      }
      default: {
        // Linux - try to detect current terminal
        const terminals = [
          {
            name: 'gnome-terminal',
            command: (path: string, cmd?: string) =>
              cmd ? `gnome-terminal --tab --working-directory="${path}" -- bash -c "${cmd}; bash"` : `gnome-terminal --tab --working-directory="${path}" -- bash`
          },
          { name: 'konsole', command: (path: string, cmd?: string) => (cmd ? `konsole --new-tab --workdir "${path}" -e bash -c "${cmd}; bash"` : `konsole --new-tab --workdir "${path}"`) },
          { name: 'xterm', command: (path: string, cmd?: string) => (cmd ? `xterm -e "cd ${path} && ${cmd}; bash"` : `xterm -e "cd ${path} && bash"`) }
        ]

        for (const terminal of terminals) {
          try {
            if (command) {
              await exec(terminal.command(absolutePath, command))
            } else {
              await exec(terminal.command(absolutePath))
            }
            success = true
            break
          } catch {
            // Try next terminal
            continue
          }
        }
      }
    }

    if (success) {
      spinner.succeed(chalk.green(command ? `Command started in new terminal tab` : `Terminal opened successfully`))
    } else {
      spinner.fail(chalk.red(`Failed to open terminal`))
    }

    return success
  } catch (error) {
    spinner.fail(chalk.red(`Failed to open terminal`))
    console.error('Failed to open terminal', error)
    return false
  }
}

/**
 * Generates a shell command for initializing Husky and setting up script permissions
 * Uses semicolons instead of && for better AppleScript compatibility
 * @returns A shell command string that handles Husky installation and script permissions
 */
function getHuskySetupCommand(extraCommand: string = ''): string {
  const huskyCommand = ['npx husky install', 'chmod -R +x .husky 2>/dev/null || true', 'chmod -R +x ./scripts/*.sh 2>/dev/null || true']

  if (extraCommand) {
    huskyCommand.push(extraCommand)
  }

  return huskyCommand.join('; ')
}

/**
 * Starts the backend server in a new terminal tab
 */
async function startBackend(projectName: string, isMonorepo: boolean, newTerminal: boolean = false): Promise<void> {
  const apiPath = isMonorepo ? 'apps/api' : `apps/${projectName}-api`

  if (!newTerminal) {
    // Start in current terminal
    exec(`cd ${apiPath} && npm run dev`)
    return
  }
  try {
    const success = await openTerminal(apiPath, {
      command: getHuskySetupCommand('npm run dev'),
      description: 'Starting backend in new terminal...'
    })

    if (!success) {
      console.error('Failed to start backend in new terminal tab')
      process.exit(1)
    }
  } catch (error) {
    console.error('Failed to start backend in new terminal tab', error)
    process.exit(1)
  }
}

/**
 * Starts the frontend server in a new terminal tab
 */
async function startFrontend(projectName: string, isMonorepo: boolean, newTerminal: boolean = false): Promise<void> {
  const webPath = isMonorepo ? 'apps/web' : `apps/${projectName}-web`

  if (!newTerminal) {
    // Start in current terminal
    exec(`cd ${webPath} && npm run dev`)
    return
  }

  try {
    const success = await openTerminal(webPath, {
      command: getHuskySetupCommand('npm run dev'),
      description: 'Starting frontend in new terminal...'
    })

    if (!success) {
      console.error('Failed to start frontend in new terminal tab')
      process.exit(1)
    }
  } catch (error) {
    console.error('Failed to start frontend in new terminal tab', error)
    process.exit(1)
  }
}

/**
 * Check if a file exists
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Main function
 */
export async function newCommand() {
  // Chat with user
  const startProjectAnswers = await getUserStartProjectInputs()

  // Set default values for database credentials
  if (startProjectAnswers.dbCredentials) startProjectAnswers.dbCredentials = setDefaultDbCredentials(startProjectAnswers.dbCredentials)

  /**
   * Project setup
   */
  // Create a main spinner with a progress indicator
  const spinner = ora({
    text: 'Setting up your project...',
    spinner: 'dots'
  }).start()

  // Calculate total steps
  const totalSteps = 3 + (startProjectAnswers.dbSetup === 'docker' ? 1 : 0) + (startProjectAnswers.setupRepo !== 'local' ? 1 : 0)
  let currentStep = 0

  const updateProgress = () => {
    currentStep++
    const percentage = Math.floor((currentStep / totalSteps) * 100)
    spinner.text = `Setting up your project... ${percentage}%`
  }

  try {
    // Disable console logs during setup to keep the UI clean
    const originalConsoleLog = console.log
    const originalConsoleError = console.error

    console.log = (message) => {
      // Only allow critical errors to pass through
      if (message && typeof message === 'string' && message.includes('ERROR')) {
        originalConsoleLog(message)
      }
    }

    console.error = (message) => {
      // Allow spinner to display errors properly
      if (message && typeof message === 'object' && message.message) {
        spinner.text = `Error: ${message.message}`
      } else {
        spinner.text = `Error: ${message}`
      }
      originalConsoleError(message)
    }

    // Create project directory
    spinner.text = 'Creating project directory...'
    await mkdir(`${startProjectAnswers.projectName}/apps`, { recursive: true })
    process.chdir(startProjectAnswers.projectName)
    updateProgress()

    // Create API app
    spinner.text = 'Setting up API application...'
    await createApiApp({
      isMonorepo: startProjectAnswers.isMonorepo,
      projectName: startProjectAnswers.projectName,
      projectDescription: startProjectAnswers.projectDescription,
      backendRepoUrl: startProjectAnswers.backendRepoUrl,
      dbCredentials: startProjectAnswers.dbCredentials,
      mainBranch: startProjectAnswers.mainBranch,
      emailService: startProjectAnswers.emailService,
      mailersendApiKey: startProjectAnswers.mailersendApiKey,
      mailersendSenderEmail: startProjectAnswers.mailersendSenderEmail,
      mailersendSenderName: startProjectAnswers.mailersendSenderName
    })
    updateProgress()

    // Create DB app
    if (startProjectAnswers.dbSetup === 'docker') {
      spinner.text = 'Setting up database application...'
      await createDbApp({
        isMonorepo: startProjectAnswers.isMonorepo,
        projectName: startProjectAnswers.projectName,
        dbCredentials: startProjectAnswers.dbCredentials
      })
      updateProgress()
    }

    // Create WEB app
    spinner.text = 'Setting up web application...'
    await createWebApp({
      isMonorepo: startProjectAnswers.isMonorepo,
      projectName: startProjectAnswers.projectName,
      projectDescription: startProjectAnswers.projectDescription,
      frontendRepoUrl: startProjectAnswers.backendRepoUrl,
      mainBranch: startProjectAnswers.mainBranch
    })
    updateProgress()

    // Restore console.log
    console.log = originalConsoleLog
    console.error = originalConsoleError

    spinner.succeed(chalk.green('Project setup completed successfully'))
  } catch (error) {
    spinner.fail(chalk.red('Failed to setup project'))
    console.error(error)
    process.exit(1)
  }

  /**
   * Project start
   */
  // Propose to start DB if using Docker or if credentials are provided
  if (startProjectAnswers.dbSetup === 'docker' || startProjectAnswers.dbSetup === 'credentials') {
    const { startDb } = await inquirer.prompt<{ startDb: boolean }>([
      {
        type: 'confirm',
        name: 'startDb',
        message: 'Do you want to initialize and start the database now?',
        default: true
      }
    ])

    if (startDb) {
      const dbSpinner = ora('Starting and initializing database...').start()

      try {
        await initAndStartDb(startProjectAnswers.projectName, startProjectAnswers.dbSetup, startProjectAnswers.isMonorepo, dbSpinner)
        dbSpinner.succeed(chalk.green('Database initialized and started successfully'))

        // If database started successfully, propose to start apps
        const { startApps } = await inquirer.prompt<{
          startApps: 'backend' | 'frontend' | 'all' | 'none'
        }>([
          {
            type: 'list',
            name: 'startApps',
            message: 'Do you want to start apps?',
            choices: [
              { name: 'Yes, start all', value: 'all' },
              { name: 'Yes, only backend', value: 'backend' },
              { name: 'Yes, only frontend', value: 'frontend' },
              { name: "No, I'll do it myself", value: 'none' }
            ],
            default: 'backend'
          }
        ])

        if (startApps === 'backend' || startApps === 'all') await startBackend(startProjectAnswers.projectName, startProjectAnswers.isMonorepo, true)
        if (startApps === 'frontend' || startApps === 'all') await startFrontend(startProjectAnswers.projectName, startProjectAnswers.isMonorepo, true)

        // If user didn't choose to start the backend, open a contextualized terminal for it
        if (startApps !== 'backend' && startApps !== 'all') {
          const apiPath = startProjectAnswers.isMonorepo ? 'apps/api' : `apps/${startProjectAnswers.projectName}-api`
          await openTerminal(apiPath, {
            command: getHuskySetupCommand(),
            description: 'Opening terminal for backend...'
          })
        }

        // If user didn't choose to start the frontend, open a contextualized terminal for it
        if (startApps !== 'frontend' && startApps !== 'all') {
          const webPath = startProjectAnswers.isMonorepo ? 'apps/web' : `apps/${startProjectAnswers.projectName}-web`
          await openTerminal(webPath, {
            command: getHuskySetupCommand(),
            description: 'Opening terminal for frontend...'
          })
        }

        // Open browser with API docs if backend is started
        if (startApps === 'backend' || startApps === 'all') {
          try {
            console.log(chalk.blue('Waiting for backend to be ready...'))
            await waitForServer('http://localhost:3500/api/health')

            console.log(chalk.blue('Opening API documentation in browser...'))
            const openCommand = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
            await exec(`${openCommand} http://localhost:3500/api/docs`)
          } catch {
            console.warn(chalk.yellow('Could not open browser automatically. Please navigate to http://localhost:3500/api/docs'))
          }
        }

        // Open browser with frontend if frontend is started
        if (startApps === 'frontend' || startApps === 'all') {
          try {
            console.log(chalk.blue('Waiting for frontend to be ready...'))
            await waitForServer('http://localhost:5173')

            console.log(chalk.blue('Opening frontend application in browser...'))
            const openCommand = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
            await exec(`${openCommand} http://localhost:5173`)
          } catch {
            console.warn(chalk.yellow('Could not open browser automatically. Please navigate to http://localhost:5173'))
          }
        }
      } catch (error) {
        dbSpinner.fail(chalk.red('Failed to start database'))
        console.error(error)
      }
    } else {
      // User doesn't want to start DB, let's open terminals for both apps
      const apiPath = startProjectAnswers.isMonorepo ? 'apps/api' : `apps/${startProjectAnswers.projectName}-api`
      const webPath = startProjectAnswers.isMonorepo ? 'apps/web' : `apps/${startProjectAnswers.projectName}-web`

      console.log(chalk.blue('Opening terminals for your project...'))

      await openTerminal(apiPath, {
        command: getHuskySetupCommand(),
        description: 'Opening terminal for backend...'
      })
      await openTerminal(webPath, {
        command: getHuskySetupCommand(),
        description: 'Opening terminal for frontend...'
      })
    }
  } else {
    // User chose manual DB setup, let's open terminals for both apps
    const apiPath = startProjectAnswers.isMonorepo ? 'apps/api' : `apps/${startProjectAnswers.projectName}-api`
    const webPath = startProjectAnswers.isMonorepo ? 'apps/web' : `apps/${startProjectAnswers.projectName}-web`

    console.log(chalk.blue('Opening terminals for your project...'))

    await openTerminal(apiPath, {
      command: getHuskySetupCommand(),
      description: 'Opening terminal for backend...'
    })
    await openTerminal(webPath, {
      command: getHuskySetupCommand(),
      description: 'Opening terminal for frontend...'
    })
  }

  // Display success message with project name
  console.log('\n')
  console.log(chalk.green('='.repeat(80)))
  console.log(chalk.green.bold(`🚀 Congratulations! Your project "${startProjectAnswers.projectName}" has been successfully set up by SaaSFoundry!`))
  console.log(chalk.green.bold(`🌍 It's now ready to become the next SaaS that will conquer the world!`))
  console.log(chalk.green.bold(`🧠 "What are we going to do tonight, Brain?" "The same thing we do every night, Pinky - try to take over the world!"`))
  console.log(chalk.green('='.repeat(80)))
  console.log('\n')
}
