import ora from 'ora'
import { exec } from 'shelljs'

export async function initAndStartDb(projectName: string, dbSetup: 'docker' | 'credentials' | 'manual', isMonorepo: boolean, spinner: ReturnType<typeof ora>) {
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
}
