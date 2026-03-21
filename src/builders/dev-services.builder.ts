import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'

import { blueprintsPath, CreateDevServicesParams } from '../types'

export async function createDevServicesCompose({ apiPath, projectName, dbSetup, dbCredentials, s3Setup, s3Credentials }: CreateDevServicesParams) {
  const serviceBlocks: string[] = []
  const volumeBlocks: string[] = []

  // --- DB service block (conditional) ---
  if (dbSetup === 'docker') {
    const dbTemplatePath = resolve(blueprintsPath, 'db/docker-compose.db.yml')
    const dbTemplateContent = await readFile(dbTemplatePath, 'utf8')

    const { user, password, database } = dbCredentials || {
      user: 'db_dev_user',
      password: 'db_dev_password',
      database: 'db_dev'
    }

    const dbCustomized = dbTemplateContent
      .replace(/container_name:.*$/m, `container_name: ${projectName}-db-dev`)
      .replace(/POSTGRES_USER:.*$/m, `POSTGRES_USER: ${user}`)
      .replace(/POSTGRES_PASSWORD:.*$/m, `POSTGRES_PASSWORD: ${password}`)
      .replace(/POSTGRES_DB:.*$/m, `POSTGRES_DB: ${database}`)
      .replace(/test: \[.*\]/m, `test: ['CMD-SHELL', 'pg_isready -U ${user} -d ${database}']`)
      .replace(/saasfoundry-network/g, `${projectName}-network`)

    // Extract the db-dev service block (everything between "services:" and "volumes:")
    const dbServiceBlock = dbCustomized.match(/services:\n([\s\S]*?)(?=\nvolumes:)/)?.[1] || ''
    serviceBlocks.push(dbServiceBlock.replace(/\n$/, ''))

    volumeBlocks.push('  db-dev-data:\n    driver: local')
  }

  // --- S3 service blocks (conditional) ---
  if (s3Setup === 'docker') {
    const s3TemplatePath = resolve(blueprintsPath, 's3/docker-compose.s3.yml')
    const s3TemplateContent = await readFile(s3TemplatePath, 'utf8')

    const accessKey = s3Credentials?.accessKey || 'minioadmin'
    const secretKey = s3Credentials?.secretKey || 'minioadmin'
    const bucket = s3Credentials?.bucket || `${projectName}-uploads`

    const s3Customized = s3TemplateContent
      .replace(/container_name:.*$/m, `container_name: ${projectName}-s3-dev`)
      .replace(/MINIO_ROOT_USER: minioadmin/g, `MINIO_ROOT_USER: ${accessKey}`)
      .replace(/MINIO_ROOT_PASSWORD: minioadmin/g, `MINIO_ROOT_PASSWORD: ${secretKey}`)
      .replace(/myminio http:\/\/s3-dev:9000 minioadmin minioadmin/, `myminio http://s3-dev:9000 ${accessKey} ${secretKey}`)
      .replace(/myminio\/saasfoundry-uploads/g, `myminio/${bucket}`)
      .replace(/saasfoundry-network/g, `${projectName}-network`)

    // Extract both s3-dev and s3-init service blocks
    const s3ServiceBlock = s3Customized.match(/services:\n([\s\S]*?)(?=\nvolumes:)/)?.[1] || ''
    serviceBlocks.push(s3ServiceBlock.replace(/\n$/, ''))

    volumeBlocks.push('  s3-dev-data:\n    driver: local')
  }

  // --- Assemble unified file ---
  const lines: string[] = []

  lines.push('services:')
  lines.push(serviceBlocks.join('\n\n'))

  lines.push('')
  lines.push('volumes:')
  lines.push(volumeBlocks.join('\n'))

  lines.push('')
  lines.push('networks:')
  lines.push(`  ${projectName}-network:`)
  lines.push('    external: true')
  lines.push('')

  await writeFile(`${apiPath}/docker-compose.dev-services.yml`, lines.join('\n'))

  return true
}
