import ora from 'ora'
import { exec } from 'shelljs'

import { getNvmPrefix } from '../utils'

export async function initAndStartDb(projectName: string, dbSetup: 'docker' | 'credentials' | 'manual', isMonorepo: boolean, spinner: ReturnType<typeof ora>) {
  spinner.text = 'Initializing and starting database...'

  if (dbSetup === 'docker') {
    // Create network if it doesn't exist
    await exec(`docker network create ${projectName}-network > /dev/null 2>&1 || true`)
    // Start the database from unified dev-services compose
    const apiPath = isMonorepo ? 'apps/api' : `apps/${projectName}-api`
    await exec(`docker compose -f ${apiPath}/docker-compose.dev-services.yml up -d db-dev > /dev/null 2>&1`)
  }

  // Initialize the database with required configurations
  spinner.text = 'Configuring database...'
  const nvm = getNvmPrefix()
  const apiPath = isMonorepo ? 'apps/api' : `apps/${projectName}-api`
  await exec(
    `${nvm}cd ${apiPath} && npm run db:update:dev -- init_data_base_config --wf --wt --wds 2> /dev/null || (${nvm}cd ${apiPath} && npm run db:update:dev -- init_data_base_config --wf --wt --wds)`
  )

  return true
}
