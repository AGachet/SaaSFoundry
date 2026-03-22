import chalk from 'chalk'
import { copy } from 'fs-extra'
import { mkdir, readFile, rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import ora from 'ora'
import { exec } from 'shelljs'
import shelljs from 'shelljs'

import { installAnalyticsModule } from '../installers/analytics.installer'
import { installEmailModule } from '../installers/email.installer'
import { installStorageModule } from '../installers/storage.installer'
import { createApiApp } from '../builders/api.builder'
import { createDevServicesCompose } from '../builders/dev-services.builder'
import { createMonorepoRoot } from '../builders/monorepo.builder'
import { createWebApp } from '../builders/web.builder'
import { getAvailableModules, getEmailModuleCredentials, getModuleSelections, getStorageModuleConfig } from '../prompts/update.prompts'
import { SaaSFoundryManifest } from '../types'
import { checkNodeVersion, computeFileHashes, fileExists, getNvmPrefix } from '../utils'
import { version as cliVersion } from '../../package.json'

interface FileUpdate {
  path: string
  action: 'update' | 'add' | 'conflict' | 'remove'
}

/**
 * Re-generate the project in a temporary directory using the current CLI version
 * with the same options from the manifest. All side effects (npm install, git init) are skipped.
 *
 * Returns the temp dir path and the file hashes of the regenerated project.
 */
async function regenerateInTempDir(manifest: SaaSFoundryManifest): Promise<{ tempDir: string; hashes: Record<string, string> }> {
  const tempDir = join(tmpdir(), `saasfoundry-update-${Date.now()}`)
  const projectDir = join(tempDir, manifest.projectName)
  await mkdir(`${projectDir}/apps`, { recursive: true })

  // Save original CWD and exec, then suppress side effects
  const originalCwd = process.cwd()
  const originalExec = shelljs.exec

  // Monkey-patch shelljs.exec to no-op (skip npm install, git init, prisma generate)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(shelljs as any).exec = () => ({ code: 0, stdout: '10.0.0', stderr: '' })

  try {
    process.chdir(projectDir)

    // Re-run API builder with dummy credentials
    await createApiApp({
      isMonorepo: manifest.structure === 'monorepo',
      projectName: manifest.projectName,
      projectDescription: '',
      backendRepoUrl: '',
      dbCredentials: { host: 'localhost', port: '5435', user: 'user', password: 'pass', database: 'db', dbType: 'postgresql' },
      mainBranch: 'main',
      emailService: manifest.modules.emailService,
      mailersendApiKey: manifest.modules.emailService === 'mailersend' ? 'dummy-key' : undefined,
      mailersendSenderEmail: manifest.modules.emailService === 'mailersend' ? 'noreply@example.com' : undefined,
      mailersendSenderName: manifest.modules.emailService === 'mailersend' ? 'App' : undefined,
      s3Setup: manifest.modules.s3Setup,
      s3Credentials: manifest.modules.s3Setup === 'credentials' ? { endpoint: '', accessKey: '', secretKey: '', bucket: '', region: '' } : undefined
    })

    // Re-run dev services builder if needed
    const hasDevServices = manifest.modules.dbSetup === 'docker' || manifest.modules.s3Setup === 'docker'
    if (hasDevServices) {
      const apiPath = manifest.structure === 'monorepo' ? 'apps/api' : `apps/${manifest.projectName}-api`
      await createDevServicesCompose({
        apiPath,
        projectName: manifest.projectName,
        dbSetup: manifest.modules.dbSetup,
        s3Setup: manifest.modules.s3Setup
      })
    }

    // Re-run web builder
    await createWebApp({
      isMonorepo: manifest.structure === 'monorepo',
      projectName: manifest.projectName,
      projectDescription: '',
      frontendRepoUrl: '',
      mainBranch: 'main',
      s3Setup: manifest.modules.s3Setup,
      includeAnalytics: manifest.modules.includeAnalytics
    })

    // Re-run monorepo root builder if applicable
    if (manifest.structure === 'monorepo') {
      await createMonorepoRoot({
        projectName: manifest.projectName,
        projectDescription: '',
        mainBranch: 'main'
      })
    }

    // Compute hashes of the regenerated project
    const hashes = await computeFileHashes('.')

    return { tempDir, hashes }
  } finally {
    process.chdir(originalCwd)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(shelljs as any).exec = originalExec
  }
}

/**
 * Compare three versions of file hashes to determine what needs updating.
 *
 * Three-way comparison:
 * - base: hash from manifest (what was originally generated)
 * - current: hash of user's current file
 * - target: hash from regenerated project (what new CLI version produces)
 */
function computeFileUpdates(baseHashes: Record<string, string>, currentHashes: Record<string, string>, targetHashes: Record<string, string>): FileUpdate[] {
  const updates: FileUpdate[] = []
  const allPaths = new Set([...Object.keys(baseHashes), ...Object.keys(targetHashes)])

  for (const filePath of allPaths) {
    const base = baseHashes[filePath]
    const current = currentHashes[filePath]
    const target = targetHashes[filePath]

    // New file in updated CLI (not in original generation)
    if (!base && target) {
      if (!current) {
        updates.push({ path: filePath, action: 'add' })
      }
      // If current exists (user created a file with the same name), skip
      continue
    }

    // File removed in updated CLI
    if (base && !target) {
      if (current && current === base) {
        // User didn't modify it, safe to flag for removal
        updates.push({ path: filePath, action: 'remove' })
      }
      continue
    }

    // File exists in both versions
    if (base && target) {
      if (base === target) continue // Template didn't change, nothing to do

      // Template changed
      if (!current || current === base) {
        // User didn't modify the file (or file was deleted) → safe to auto-update
        updates.push({ path: filePath, action: 'update' })
      } else if (current === target) {
        // User already has the new version (unlikely but possible)
        continue
      } else {
        // Both user AND template changed → conflict
        updates.push({ path: filePath, action: 'conflict' })
      }
    }
  }

  return updates
}

/**
 * Apply file updates from the regenerated project to the user's project.
 */
async function applyFileUpdates(
  updates: FileUpdate[],
  tempProjectDir: string,
  spinner: ReturnType<typeof ora>
): Promise<{ applied: FileUpdate[]; conflicts: FileUpdate[]; added: FileUpdate[]; removed: FileUpdate[] }> {
  const applied: FileUpdate[] = []
  const conflicts: FileUpdate[] = []
  const added: FileUpdate[] = []
  const removed: FileUpdate[] = []

  for (const update of updates) {
    const sourcePath = join(tempProjectDir, update.path)
    const destPath = update.path

    switch (update.action) {
      case 'update': {
        spinner.text = `Updating ${update.path}...`
        const content = await readFile(sourcePath, 'utf8')
        await writeFile(destPath, content)
        applied.push(update)
        break
      }
      case 'add': {
        spinner.text = `Adding ${update.path}...`
        await copy(sourcePath, destPath)
        added.push(update)
        break
      }
      case 'conflict': {
        // Save the new version alongside the original with .saasfoundry.new extension
        const newContent = await readFile(sourcePath, 'utf8')
        await writeFile(`${destPath}.saasfoundry.new`, newContent)
        conflicts.push(update)
        break
      }
      case 'remove': {
        // Don't auto-delete, just warn
        removed.push(update)
        break
      }
    }
  }

  return { applied, conflicts, added, removed }
}

/**
 * Update command — Update templates and add modules to an existing SaaSFoundry project.
 *
 * This command handles two flows:
 * 1. Template updates: When CLI version differs from project version, regenerate templates
 *    and apply changes to files the user hasn't modified (three-way merge).
 * 2. Module addition: Detect available but uninstalled modules and let users add them.
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
  console.log(chalk.white(`  Project:         ${manifest.projectName}`))
  console.log(chalk.white(`  Structure:       ${manifest.structure}`))
  console.log(chalk.white(`  Project version: ${manifest.version}`))
  console.log(chalk.white(`  CLI version:     ${cliVersion}`))
  console.log()

  // ─── FLOW 1: Template updates (version differs) ───
  if (manifest.version !== cliVersion) {
    if (!manifest.fileHashes) {
      console.log(chalk.yellow(`  Your project was generated with SaaSFoundry v${manifest.version} (before hash tracking).`))
      console.log(chalk.yellow('  Template updates require file hashes. Skipping template update.\n'))
      console.log(chalk.yellow('  To enable template updates, regenerate your project or manually add fileHashes to .saasfoundry.json.\n'))
    } else {
      console.log(chalk.yellow(`  Version change detected: v${manifest.version} → v${cliVersion}`))
      console.log(chalk.blue('  Analyzing template changes...\n'))

      const spinner = ora('Regenerating project templates...').start()
      let tempDir: string | undefined

      try {
        // Regenerate project in temp dir with current CLI
        const result = await regenerateInTempDir(manifest)
        tempDir = result.tempDir
        const targetHashes = result.hashes
        const tempProjectDir = join(tempDir, manifest.projectName)

        // Compute current file hashes
        spinner.text = 'Computing current file hashes...'
        const currentHashes = await computeFileHashes('.')

        // Three-way comparison
        spinner.text = 'Comparing files...'
        const updates = computeFileUpdates(manifest.fileHashes, currentHashes, targetHashes)

        if (updates.length === 0) {
          spinner.succeed(chalk.green('No template changes to apply.'))
        } else {
          spinner.text = 'Applying updates...'
          const { applied, conflicts, added, removed } = await applyFileUpdates(updates, tempProjectDir, spinner)

          spinner.succeed(chalk.green('Template update complete.'))

          // Summary
          if (applied.length > 0) {
            console.log(chalk.green(`\n  ${applied.length} file(s) auto-updated:`))
            for (const f of applied) console.log(chalk.green(`    ✓ ${f.path}`))
          }

          if (added.length > 0) {
            console.log(chalk.green(`\n  ${added.length} new file(s) added:`))
            for (const f of added) console.log(chalk.green(`    + ${f.path}`))
          }

          if (removed.length > 0) {
            console.log(chalk.yellow(`\n  ${removed.length} file(s) removed in new version (not auto-deleted):`))
            for (const f of removed) console.log(chalk.yellow(`    - ${f.path}`))
          }

          if (conflicts.length > 0) {
            console.log(chalk.red(`\n  ${conflicts.length} conflict(s) — both you and SaaSFoundry modified these files:`))
            for (const f of conflicts) {
              console.log(chalk.red(`    ! ${f.path}`))
              console.log(chalk.yellow(`      → Review ${f.path}.saasfoundry.new and merge manually`))
            }
          }
        }

        // Update manifest version and recompute hashes
        manifest.version = cliVersion
        manifest.fileHashes = await computeFileHashes('.')
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2))
      } catch (error) {
        spinner.fail(chalk.red('Failed to update templates'))
        console.error(error)
      } finally {
        // Clean up temp dir
        if (tempDir) {
          await rm(tempDir, { recursive: true, force: true }).catch(() => {})
        }
      }

      console.log()
    }
  } else {
    console.log(chalk.green('  Your project is up to date with the current CLI version.\n'))
  }

  // ─── FLOW 2: Module addition ───
  const availableModules = getAvailableModules(manifest)

  if (availableModules.length === 0) {
    if (manifest.version === cliVersion) {
      console.log(chalk.green('  All available modules are already installed. Nothing to update.'))
    }
    return
  }

  console.log(chalk.blue(`  ${availableModules.length} module(s) available to add:\n`))

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
  const moduleSpinner = ora('Installing modules...').start()

  try {
    if (selectedModules.includes('email') && emailCredentials) {
      moduleSpinner.text = 'Installing MailerSend email module...'
      await installEmailModule({
        apiPath,
        mailersendApiKey: emailCredentials.mailersendApiKey,
        mailersendSenderEmail: emailCredentials.mailersendSenderEmail,
        mailersendSenderName: emailCredentials.mailersendSenderName
      })
      manifest.modules.emailService = 'mailersend'
    }

    if (selectedModules.includes('storage') && storageConfig) {
      moduleSpinner.text = 'Installing S3 storage module...'
      await installStorageModule({
        apiPath,
        webPath,
        isMonorepo,
        projectName: manifest.projectName,
        s3Setup: storageConfig.s3Setup,
        s3Credentials: storageConfig.s3Credentials,
        skipNpmInstall: true
      })

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

    if (selectedModules.includes('analytics')) {
      moduleSpinner.text = 'Installing Umami analytics module...'
      await installAnalyticsModule({ webPath })
      manifest.modules.includeAnalytics = true
    }

    // Run npm install if new dependencies were added
    if (selectedModules.includes('storage') || selectedModules.includes('email')) {
      moduleSpinner.text = 'Installing dependencies...'
      const nvm = getNvmPrefix()
      if (isMonorepo) {
        await exec(`${nvm}npm install > /dev/null 2>&1`)
      } else {
        await exec(`${nvm}npm install --prefix ${apiPath} > /dev/null 2>&1`)
      }
    }

    // Recompute file hashes after module installation and update manifest
    moduleSpinner.text = 'Updating project manifest...'
    manifest.fileHashes = await computeFileHashes('.')
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2))

    moduleSpinner.succeed(chalk.green('Modules installed successfully'))
  } catch (error) {
    moduleSpinner.fail(chalk.red('Failed to install modules'))
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
