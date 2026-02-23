import chalk from 'chalk'
import inquirer from 'inquirer'
import { mkdir } from 'fs/promises'
import ora from 'ora'
import { exec } from 'shelljs'

import { createApiApp } from '../builders/api.builder'
import { createDbApp } from '../builders/db.builder'
import { createS3App } from '../builders/s3.builder'
import { createWebApp } from '../builders/web.builder'
import { getUserStartProjectInputs } from '../prompts/project.prompts'
import { initAndStartDb } from '../runners/database.runner'
import { initAndStartS3 } from '../runners/s3.runner'
import { startBackend, startFrontend, waitForServer } from '../runners/server.runner'
import { getHuskySetupCommand, openTerminal } from '../runners/terminal.runner'
import { checkNodeVersion, setDefaultDbCredentials } from '../utils'

/**
 * Main function
 */
export async function newCommand() {
  // Verify Node.js version before proceeding
  checkNodeVersion()

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
  const totalSteps = 3 + (startProjectAnswers.dbSetup === 'docker' ? 1 : 0) + (startProjectAnswers.s3Setup === 'docker' ? 1 : 0)
  let currentStep = 0

  const updateProgress = () => {
    currentStep++
    const percentage = Math.floor((currentStep / totalSteps) * 100)
    spinner.text = `Setting up your project... ${percentage}%`
  }

  // Disable console logs during setup to keep the UI clean
  const originalConsoleLog = console.log
  const originalConsoleError = console.error

  try {
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
      mailersendSenderName: startProjectAnswers.mailersendSenderName,
      s3Setup: startProjectAnswers.s3Setup,
      s3Credentials: startProjectAnswers.s3Credentials
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

    // Create S3 app
    if (startProjectAnswers.s3Setup === 'docker') {
      spinner.text = 'Setting up S3 storage (MinIO)...'
      await createS3App({
        isMonorepo: startProjectAnswers.isMonorepo,
        projectName: startProjectAnswers.projectName,
        s3Credentials: startProjectAnswers.s3Credentials
      })
      updateProgress()
    }

    // Create WEB app
    spinner.text = 'Setting up web application...'
    await createWebApp({
      isMonorepo: startProjectAnswers.isMonorepo,
      projectName: startProjectAnswers.projectName,
      projectDescription: startProjectAnswers.projectDescription,
      frontendRepoUrl: startProjectAnswers.frontendRepoUrl || '',
      mainBranch: startProjectAnswers.mainBranch,
      s3Setup: startProjectAnswers.s3Setup
    })
    updateProgress()

    spinner.succeed(chalk.green('Project setup completed successfully'))
  } catch (error) {
    spinner.fail(chalk.red('Failed to setup project'))
    console.error(error)
    process.exit(1)
  } finally {
    console.log = originalConsoleLog
    console.error = originalConsoleError
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

        // Start S3 if Docker setup was selected
        if (startProjectAnswers.s3Setup === 'docker') {
          const s3Spinner = ora('Starting MinIO S3 storage...').start()
          try {
            await initAndStartS3(startProjectAnswers.projectName, startProjectAnswers.isMonorepo, s3Spinner)
            s3Spinner.succeed(chalk.green('MinIO S3 storage started successfully'))
            console.log(chalk.blue('MinIO Console available at: http://localhost:9001'))
          } catch (error) {
            s3Spinner.fail(chalk.red('Failed to start MinIO S3 storage'))
            console.error(error)
          }
        }

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
