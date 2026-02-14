import { copy } from 'fs-extra'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'

import { blueprintsPath, CreateDbAppParams } from '../types'
import { validateProjectName } from '../utils'

export async function createDbApp({ isMonorepo, projectName, dbCredentials }: CreateDbAppParams) {
  validateProjectName(projectName)

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
}
