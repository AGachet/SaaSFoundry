import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'
import { exec } from 'shelljs'

export const dbCommand = new Command('db')
  .description('Manage your development database')
  .addCommand(
    new Command('start').description('Start the development database').action(async () => {
      const spinner = ora('Starting development database...').start()
      try {
        exec('docker-compose up -d db')
        spinner.succeed(chalk.green('Development database started successfully!'))
        console.log(chalk.blue('\nDatabase is running on port 5434'))
      } catch (error) {
        spinner.fail(chalk.red('Failed to start development database'))
        console.error(error)
        process.exit(1)
      }
    })
  )
  .addCommand(
    new Command('stop').description('Stop the development database').action(async () => {
      const spinner = ora('Stopping development database...').start()
      try {
        exec('docker-compose stop db')
        spinner.succeed(chalk.green('Development database stopped successfully!'))
      } catch (error) {
        spinner.fail(chalk.red('Failed to stop development database'))
        console.error(error)
        process.exit(1)
      }
    })
  )
  .addCommand(
    new Command('reset').description('Reset the development database').action(async () => {
      const spinner = ora('Resetting development database...').start()
      try {
        exec('docker-compose down -v db')
        exec('docker-compose up -d db')
        spinner.succeed(chalk.green('Development database reset successfully!'))
      } catch (error) {
        spinner.fail(chalk.red('Failed to reset development database'))
        console.error(error)
        process.exit(1)
      }
    })
  )
