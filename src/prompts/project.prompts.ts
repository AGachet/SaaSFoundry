import chalk from 'chalk'
import inquirer from 'inquirer'
import { exec } from 'shelljs'

import { Answers } from '../types'

/**
 * Get user inputs
 */
export async function getUserStartProjectInputs() {
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

  // Handle MailerSend configuration immediately after email service choice
  if (answers.emailService === 'mailersend') {
    console.log(chalk.yellow('\nYou need to create an account on MailerSend to get your API key.'))
    console.log(chalk.yellow('Note: The following link is an affiliate link. We appreciate your support of the SaaSFoundry project by signing up through this link.'))
    console.log(chalk.yellow('Opening https://www.mailersend.com?ref=52o9lkySkTka in your browser in few seconds...'))

    // Wait a few seconds before opening the URL
    await new Promise((resolve) => setTimeout(resolve, 4000))

    // Open the URL in the default browser
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

      Object.assign(answers, mailerSendAnswers)
    } else {
      console.log(chalk.yellow('\nThe email service logic will be set up but disabled until you implement your own service.'))
    }
  }

  // S3 storage setup (asked after email configuration)
  const s3Answers = await inquirer.prompt<Answers>([
    {
      type: 'list',
      name: 's3Setup',
      message: 'Do you want to set up object storage (S3) for file uploads (logos, documents, etc.)?',
      choices: [
        {
          name: 'Yes, set up MinIO with Docker (free, S3-compatible)',
          value: 'docker'
        },
        {
          name: 'Yes, connect to my existing S3-compatible server',
          value: 'credentials'
        },
        { name: "No, I'll do it later", value: 'manual' }
      ]
    },
    {
      type: 'input',
      name: 's3Credentials.endpoint',
      message: 'S3 endpoint URL (e.g. https://s3.amazonaws.com or http://minio.example.com:9000)',
      when: (s3: Answers) => s3.s3Setup === 'credentials',
      validate: (input: string) => {
        if (!input) return 'Endpoint URL is required'
        return true
      }
    },
    {
      type: 'input',
      name: 's3Credentials.accessKey',
      message: 'S3 access key',
      when: (s3: Answers) => s3.s3Setup === 'credentials',
      validate: (input: string) => {
        if (!input) return 'Access key is required'
        return true
      }
    },
    {
      type: 'input',
      name: 's3Credentials.secretKey',
      message: 'S3 secret key',
      when: (s3: Answers) => s3.s3Setup === 'credentials',
      validate: (input: string) => {
        if (!input) return 'Secret key is required'
        return true
      }
    },
    {
      type: 'input',
      name: 's3Credentials.bucket',
      message: 'S3 bucket name',
      when: (s3: Answers) => s3.s3Setup === 'credentials' || s3.s3Setup === 'docker',
      default: () => `${answers.projectName}-uploads`
    },
    {
      type: 'input',
      name: 's3Credentials.region',
      message: 'S3 region',
      when: (s3: Answers) => s3.s3Setup === 'credentials',
      default: 'us-east-1'
    }
  ])

  return { ...answers, ...s3Answers }
}
