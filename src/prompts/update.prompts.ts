import chalk from 'chalk'
import inquirer from 'inquirer'
import { exec } from 'shelljs'

import { Answers, SaaSFoundryManifest } from '../types'

interface AvailableModule {
  name: string
  description: string
  value: string
}

/**
 * Detect which modules are available but not installed based on the manifest.
 */
export function getAvailableModules(manifest: SaaSFoundryManifest): AvailableModule[] {
  const available: AvailableModule[] = []

  if (manifest.modules.emailService === 'none') {
    available.push({
      name: 'MailerSend Email Service',
      description: 'Transactional emails (account creation, password reset, invitations) via MailerSend [free, 3000 emails/month]',
      value: 'email'
    })
  }

  if (manifest.modules.s3Setup === 'manual') {
    available.push({
      name: 'S3 Object Storage',
      description: 'File uploads (logos, documents) with S3-compatible storage (MinIO via Docker or existing server)',
      value: 'storage'
    })
  }

  if (!manifest.modules.includeAnalytics) {
    available.push({
      name: 'Umami Analytics',
      description: 'Privacy-friendly anonymous user analytics (self-hosted, production only)',
      value: 'analytics'
    })
  }

  return available
}

/**
 * Ask user which modules they want to add.
 */
export async function getModuleSelections(availableModules: AvailableModule[]): Promise<string[]> {
  const { selectedModules } = await inquirer.prompt<{ selectedModules: string[] }>([
    {
      type: 'checkbox',
      name: 'selectedModules',
      message: 'Which modules would you like to add?',
      choices: availableModules.map((m) => ({
        name: `${m.name} — ${m.description}`,
        value: m.value
      }))
    }
  ])

  return selectedModules
}

/**
 * Ask for MailerSend credentials when adding the email module.
 */
export async function getEmailModuleCredentials(projectName: string): Promise<{ mailersendApiKey: string; mailersendSenderEmail: string; mailersendSenderName: string } | null> {
  console.log(chalk.yellow('\nYou need a MailerSend account to get your API key.'))
  console.log(chalk.yellow('Note: The following link is an affiliate link. We appreciate your support of the SaaSFoundry project by signing up through this link.'))
  console.log(chalk.yellow('Opening https://www.mailersend.com?ref=52o9lkySkTka in your browser in few seconds...'))

  await new Promise((resolve) => setTimeout(resolve, 4000))

  const openCommand = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open'
  await exec(`${openCommand} https://www.mailersend.com/signup?ref=52o9lkySkTka`)

  const { ready } = await inquirer.prompt<{ ready: boolean }>([
    {
      type: 'confirm',
      name: 'ready',
      message: 'Are you ready to configure your MailerSend credentials?',
      default: true
    }
  ])

  if (!ready) {
    console.log(chalk.yellow('\nSkipping email module. You can add it later with `sf update`.'))
    return null
  }

  const credentials = await inquirer.prompt<{
    mailersendApiKey: string
    mailersendSenderEmail: string
    mailersendSenderName: string
  }>([
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
      default: `noreply@${projectName.toLowerCase().replace(/\s+/g, '')}.com`,
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
      default: projectName.charAt(0).toUpperCase() + projectName.slice(1),
      validate: (input: string) => {
        if (!input) return 'Sender name is required'
        return true
      }
    }
  ])

  return credentials
}

/**
 * Ask for S3 storage setup preferences when adding the storage module.
 */
export async function getStorageModuleConfig(projectName: string): Promise<{ s3Setup: 'docker' | 'credentials'; s3Credentials?: Answers['s3Credentials'] }> {
  const { s3Setup } = await inquirer.prompt<{ s3Setup: 'docker' | 'credentials' }>([
    {
      type: 'list',
      name: 's3Setup',
      message: 'How would you like to set up S3 storage?',
      choices: [
        {
          name: 'MinIO with Docker (free, S3-compatible, added to dev services)',
          value: 'docker'
        },
        {
          name: 'Connect to my existing S3-compatible server',
          value: 'credentials'
        }
      ]
    }
  ])

  if (s3Setup === 'credentials') {
    const s3Credentials = await inquirer.prompt<NonNullable<Answers['s3Credentials']>>([
      {
        type: 'input',
        name: 'endpoint',
        message: 'S3 endpoint URL (e.g. https://s3.amazonaws.com or http://minio.example.com:9000)',
        validate: (input: string) => {
          if (!input) return 'Endpoint URL is required'
          return true
        }
      },
      {
        type: 'input',
        name: 'accessKey',
        message: 'S3 access key',
        validate: (input: string) => {
          if (!input) return 'Access key is required'
          return true
        }
      },
      {
        type: 'input',
        name: 'secretKey',
        message: 'S3 secret key',
        validate: (input: string) => {
          if (!input) return 'Secret key is required'
          return true
        }
      },
      {
        type: 'input',
        name: 'bucket',
        message: 'S3 bucket name',
        default: `${projectName}-uploads`
      },
      {
        type: 'input',
        name: 'region',
        message: 'S3 region',
        default: 'us-east-1'
      }
    ])

    return { s3Setup, s3Credentials }
  }

  return { s3Setup }
}
