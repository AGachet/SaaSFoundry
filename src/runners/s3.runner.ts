import ora from 'ora'
import { exec } from 'shelljs'

export async function initAndStartS3(projectName: string, isMonorepo: boolean, spinner: ReturnType<typeof ora>) {
  spinner.text = 'Starting MinIO S3 storage...'

  // Create network if it doesn't exist
  await exec(`docker network create ${projectName}-network > /dev/null 2>&1 || true`)

  // Start MinIO
  const s3Path = isMonorepo ? 'apps/s3' : `apps/${projectName}-s3`
  await exec(`docker-compose -f ${s3Path}/docker-compose.s3.yml up -d > /dev/null 2>&1`)

  return true
}
