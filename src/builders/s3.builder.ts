import { copy } from 'fs-extra'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'

import { blueprintsPath, CreateS3AppParams } from '../types'
import { validateProjectName } from '../utils'

export async function createS3App({ isMonorepo, projectName, s3Credentials }: CreateS3AppParams) {
  validateProjectName(projectName)

  // Copy the S3 app directory
  const s3Path = isMonorepo ? 'apps/s3' : `apps/${projectName}-s3`
  await copy(resolve(blueprintsPath, 's3'), s3Path)

  // Update S3 credentials
  const templatePath = resolve(blueprintsPath, 's3/docker-compose.s3.yml')
  const templateContent = await readFile(templatePath, 'utf8')

  const accessKey = s3Credentials?.accessKey || 'minioadmin'
  const secretKey = s3Credentials?.secretKey || 'minioadmin'
  const bucket = s3Credentials?.bucket || `${projectName}-uploads`

  const customizedContent = templateContent
    .replace(/container_name:.*$/m, `container_name: ${projectName}-s3-dev`)
    .replace(/MINIO_ROOT_USER: minioadmin/g, `MINIO_ROOT_USER: ${accessKey}`)
    .replace(/MINIO_ROOT_PASSWORD: minioadmin/g, `MINIO_ROOT_PASSWORD: ${secretKey}`)
    .replace(/myminio http:\/\/s3-dev:9000 minioadmin minioadmin/, `myminio http://s3-dev:9000 ${accessKey} ${secretKey}`)
    .replace(/myminio\/saasfoundry-uploads/g, `myminio/${bucket}`)
    .replace(/saasfoundry-network/g, `${projectName}-network`)

  await writeFile(`${s3Path}/docker-compose.s3.yml`, customizedContent)

  return true
}
