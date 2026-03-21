import ora from 'ora'
import { exec } from 'shelljs'

export async function initAndStartS3(projectName: string, isMonorepo: boolean, spinner: ReturnType<typeof ora>) {
  spinner.text = 'Starting MinIO S3 storage...'

  // Create network if it doesn't exist
  await exec(`docker network create ${projectName}-network > /dev/null 2>&1 || true`)

  // Start MinIO from unified dev-services compose
  const apiPath = isMonorepo ? 'apps/api' : `apps/${projectName}-api`
  await exec(`docker compose -f ${apiPath}/docker-compose.dev-services.yml up -d s3-dev s3-init > /dev/null 2>&1`)

  return true
}
