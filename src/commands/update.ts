import chalk from 'chalk'
import { readFile, writeFile } from 'fs/promises'
import ora from 'ora'
import { exec } from 'shelljs'

import { installAnalyticsModule } from '../installers/analytics.installer'
import { installEmailModule } from '../installers/email.installer'
import { installStorageModule } from '../installers/storage.installer'
import { createDevServicesCompose } from '../builders/dev-services.builder'
import { getAvailableModules, getEmailModuleCredentials, getModuleSelections, getStorageModuleConfig } from '../prompts/update.prompts'
import { SaaSFoundryManifest } from '../types'
import { checkNodeVersion, fileExists, getNvmPrefix } from '../utils'
import { version as cliVersion } from '../../package.json'

/**
 * Update command — Add modules to an existing SaaSFoundry project.
 *
 * This command:
 * 1. Reads .saasfoundry.json manifest from the current directory
 * 2. Compares CLI version with project version
 * 3. Detects available but uninstalled modules
 * 4. Prompts user to select modules to add
 * 5. Applies module installers
 * 6. Updates the manifest
 */
export async function updateCommand() {
  checkNodeVersion()

  // Read manifest
  const manifestPath = '.saasfoundry.json'
  if (!(await fileExists(manifestPath))) {
    console.error(chalk.red('No .saasfoundry.json found in the current directory.'))
    console.error(chalk.red('This command must be run from the root of a SaaSFoundry project.'))
    console.error(chalk.yellow('If this project was generated before manifest support, you can create one manually.'))
    process.exit(1)
  }

  const manifest: SaaSFoundryManifest = JSON.parse(await readFile(manifestPath, 'utf8'))

  // Display project info
  console.log(chalk.blue('\n  SaaSFoundry Project Update'))
  console.log(chalk.blue('  ' + '─'.repeat(40)))
  console.log(chalk.white(`  Project:        ${manifest.projectName}`))
  console.log(chalk.white(`  Structure:      ${manifest.structure}`))
  console.log(chalk.white(`  Project version: ${manifest.version}`))
  console.log(chalk.white(`  CLI version:     ${cliVersion}`))
  console.log()

  // Version comparison
  if (manifest.version !== cliVersion) {
    console.log(chalk.yellow(`  Your project was generated with SaaSFoundry v${manifest.version}.`))
    console.log(chalk.yellow(`  Current CLI version is v${cliVersion}.`))
    console.log(chalk.yellow('  Template file updates are not yet supported — only module addition is available.\n'))
  } else {
    console.log(chalk.green('  Your project is up to date with the current CLI version.\n'))
  }

  // Detect available modules
  const availableModules = getAvailableModules(manifest)

  if (availableModules.length === 0) {
    console.log(chalk.green('  All available modules are already installed. Nothing to update.'))
    return
  }

  console.log(chalk.blue(`  ${availableModules.length} module(s) available to add:\n`))

  // Ask which modules to add
  const selectedModules = await getModuleSelections(availableModules)

  if (selectedModules.length === 0) {
    console.log(chalk.yellow('\nNo modules selected. Nothing to do.'))
    return
  }

  // Resolve app paths
  const isMonorepo = manifest.structure === 'monorepo'
  const apiPath = isMonorepo ? 'apps/api' : `apps/${manifest.projectName}-api`
  const webPath = isMonorepo ? 'apps/web' : `apps/${manifest.projectName}-web`

  // Collect credentials for selected modules
  let emailCredentials: { mailersendApiKey: string; mailersendSenderEmail: string; mailersendSenderName: string } | null = null
  let storageConfig: { s3Setup: 'docker' | 'credentials'; s3Credentials?: { endpoint: string; accessKey: string; secretKey: string; bucket: string; region: string } } | null = null

  if (selectedModules.includes('email')) {
    emailCredentials = await getEmailModuleCredentials(manifest.projectName)
    if (!emailCredentials) {
      // User cancelled email setup, remove from selection
      selectedModules.splice(selectedModules.indexOf('email'), 1)
    }
  }

  if (selectedModules.includes('storage')) {
    storageConfig = await getStorageModuleConfig(manifest.projectName)
  }

  if (selectedModules.length === 0) {
    console.log(chalk.yellow('\nNo modules to install. Nothing to do.'))
    return
  }

  // Install modules
  const spinner = ora('Installing modules...').start()

  try {
    // Install email module
    if (selectedModules.includes('email') && emailCredentials) {
      spinner.text = 'Installing MailerSend email module...'
      await installEmailModule({
        apiPath,
        mailersendApiKey: emailCredentials.mailersendApiKey,
        mailersendSenderEmail: emailCredentials.mailersendSenderEmail,
        mailersendSenderName: emailCredentials.mailersendSenderName
      })
      manifest.modules.emailService = 'mailersend'
    }

    // Install storage module
    if (selectedModules.includes('storage') && storageConfig) {
      spinner.text = 'Installing S3 storage module...'
      await installStorageModule({
        apiPath,
        webPath,
        isMonorepo,
        projectName: manifest.projectName,
        s3Setup: storageConfig.s3Setup,
        s3Credentials: storageConfig.s3Credentials,
        skipNpmInstall: true
      })

      // Create or update dev-services compose file if using Docker
      if (storageConfig.s3Setup === 'docker') {
        await createDevServicesCompose({
          apiPath,
          projectName: manifest.projectName,
          dbSetup: manifest.modules.dbSetup,
          s3Setup: storageConfig.s3Setup,
          s3Credentials: storageConfig.s3Credentials
        })
      }

      manifest.modules.s3Setup = storageConfig.s3Setup
    }

    // Install analytics module
    if (selectedModules.includes('analytics')) {
      spinner.text = 'Installing Umami analytics module...'
      await installAnalyticsModule({ webPath })
      manifest.modules.includeAnalytics = true
    }

    // Run npm install if new dependencies were added
    if (selectedModules.includes('storage') || selectedModules.includes('email')) {
      spinner.text = 'Installing dependencies...'
      const nvm = getNvmPrefix()
      if (isMonorepo) {
        await exec(`${nvm}npm install > /dev/null 2>&1`)
      } else {
        await exec(`${nvm}npm install --prefix ${apiPath} > /dev/null 2>&1`)
      }
    }

    // Update manifest
    spinner.text = 'Updating project manifest...'
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2))

    spinner.succeed(chalk.green('Modules installed successfully'))
  } catch (error) {
    spinner.fail(chalk.red('Failed to install modules'))
    console.error(error)
    process.exit(1)
  }

  // Display summary
  console.log(chalk.green('\n  ' + '═'.repeat(60)))
  console.log(chalk.green.bold('  Modules installed:'))
  if (selectedModules.includes('email')) console.log(chalk.green('    ✓ MailerSend Email Service'))
  if (selectedModules.includes('storage')) console.log(chalk.green('    ✓ S3 Object Storage'))
  if (selectedModules.includes('analytics')) console.log(chalk.green('    ✓ Umami Analytics'))
  console.log(chalk.green('  ' + '═'.repeat(60)))
  console.log()

  if (selectedModules.includes('analytics')) {
    console.log(chalk.blue('  Note: To configure Umami analytics, set VITE_ANALYTICS_URL and'))
    console.log(chalk.blue('  VITE_ANALYTICS_WEBSITE_ID in your web app .env file.'))
    console.log()
  }

  if (selectedModules.includes('storage') && storageConfig?.s3Setup === 'docker') {
    console.log(chalk.blue('  To start MinIO, run:'))
    console.log(chalk.blue(`    docker compose -f ${apiPath}/docker-compose.dev-services.yml up -d s3-dev s3-init`))
    console.log(chalk.blue('  MinIO Console: http://localhost:9001'))
    console.log()
  }
}
