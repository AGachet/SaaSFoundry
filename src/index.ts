import { Command } from 'commander'
import 'module-alias/register'
import { version } from '../package.json'
import { dbCommand } from './commands/db'
import { newCommand } from './commands/new'

const program = new Command()

program.name('sf').description('SaaSFoundry CLI - Create and manage your SaaS projects').version(version)
program.command('new').description('Create a new SaaSFoundry project').action(newCommand)
program.addCommand(dbCommand)
program.parse()

export { newCommand }
