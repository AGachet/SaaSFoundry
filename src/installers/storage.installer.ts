import { copy } from 'fs-extra'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { exec } from 'shelljs'

import { overlaysPath, S3Credentials } from '../types'
import { fileExists, getNvmPrefix } from '../utils'

interface InstallStorageModuleParams {
  apiPath: string
  webPath: string
  isMonorepo: boolean
  projectName: string
  s3Setup: 'docker' | 'credentials' | 'manual'
  s3Credentials?: S3Credentials
  skipNpmInstall?: boolean
}

/**
 * Install the S3 storage module on API + Web apps.
 *
 * This function:
 * 1. Copies the storage overlay module to the API app
 * 2. Adds @aws-sdk/client-s3 and @types/multer dependencies to API package.json
 * 3. Runs npm install (unless monorepo or skipNpmInstall)
 * 4. Uncomments `// TODO storage-service-active:` markers in env.service, app.module, org module/controller/service
 * 5. Updates API .env and .env.test with S3 credentials
 * 6. Sets VITE_STORAGE_ENABLED=true in web .env
 *
 * Used by both `sf new` (during initial project generation) and `sf update` (when adding the module later).
 */
export async function installStorageModule({ apiPath, webPath, isMonorepo, projectName, s3Setup, s3Credentials, skipNpmInstall }: InstallStorageModuleParams) {
  // Copy storage overlay module to the API
  const storageOverlayPath = resolve(overlaysPath, 'modules/storage')
  const apiStoragePath = `${apiPath}/src/modules/storage`
  await copy(storageOverlayPath, apiStoragePath)

  // Add @aws-sdk/client-s3 dependency and @types/multer for file uploads
  const pkgPath = `${apiPath}/package.json`
  const pkg = JSON.parse(await readFile(pkgPath, 'utf8'))
  pkg.dependencies['@aws-sdk/client-s3'] = '3.750.0'
  pkg.devDependencies['@types/multer'] = '2.0.0'
  await writeFile(pkgPath, JSON.stringify(pkg, null, 2))

  // Run npm install (unless monorepo handles it or explicitly skipped)
  if (!isMonorepo && !skipNpmInstall) {
    const nvm = getNvmPrefix()
    await exec(`${nvm}npm install --prefix ${apiPath} > /dev/null 2>&1`)
  }

  // Uncomment storage configuration in env.service.ts
  const envServicePath = `${apiPath}/src/configs/env/services/env.service.ts`
  let envServiceContent = await readFile(envServicePath, 'utf8')
  envServiceContent = envServiceContent.replace(/\/\/ TODO storage-service-active: /g, '')
  await writeFile(envServicePath, envServiceContent)

  // Uncomment storage imports in app.module.ts
  const appModulePath = `${apiPath}/src/app.module.ts`
  let appModuleContent = await readFile(appModulePath, 'utf8')
  appModuleContent = appModuleContent.replace(/\/\/ TODO storage-service-active: /g, '')
  await writeFile(appModulePath, appModuleContent)

  // Uncomment storage imports in organizations.module.ts
  const orgModulePath = `${apiPath}/src/modules/organizations/organizations.module.ts`
  let orgModuleContent = await readFile(orgModulePath, 'utf8')
  orgModuleContent = orgModuleContent.replace(/\/\/ TODO storage-service-active: /g, '')
  await writeFile(orgModulePath, orgModuleContent)

  // Uncomment storage code in organization.controller.ts
  const orgControllerPath = `${apiPath}/src/modules/organizations/controllers/organization.controller.ts`
  let orgControllerContent = await readFile(orgControllerPath, 'utf8')
  orgControllerContent = orgControllerContent.replace(/\/\/ TODO storage-service-active: /g, '')
  await writeFile(orgControllerPath, orgControllerContent)

  // Uncomment storage code in organization.service.ts
  const orgServicePath = `${apiPath}/src/modules/organizations/services/organization.service.ts`
  let orgServiceContent = await readFile(orgServicePath, 'utf8')
  orgServiceContent = orgServiceContent.replace(/\/\/ TODO storage-service-active: /g, '')
  await writeFile(orgServicePath, orgServiceContent)

  // Determine S3 credentials
  const s3Endpoint = s3Setup === 'docker' ? 'http://localhost:9000' : s3Credentials?.endpoint || ''
  const s3AccessKey = s3Setup === 'docker' ? 'minioadmin' : s3Credentials?.accessKey || ''
  const s3SecretKey = s3Setup === 'docker' ? 'minioadmin' : s3Credentials?.secretKey || ''
  const s3Bucket = s3Credentials?.bucket || `${projectName}-uploads`
  const s3Region = s3Credentials?.region || 'us-east-1'

  // Update API .env with S3 credentials
  const envPath = `${apiPath}/.env`
  if (await fileExists(envPath)) {
    let envContent = await readFile(envPath, 'utf8')
    envContent = envContent
      .replace(/# S3_ENDPOINT=.*$/m, `S3_ENDPOINT="${s3Endpoint}"`)
      .replace(/# S3_ACCESS_KEY=.*$/m, `S3_ACCESS_KEY="${s3AccessKey}"`)
      .replace(/# S3_SECRET_KEY=.*$/m, `S3_SECRET_KEY="${s3SecretKey}"`)
      .replace(/# S3_BUCKET=.*$/m, `S3_BUCKET="${s3Bucket}"`)
      .replace(/# S3_REGION=.*$/m, `S3_REGION="${s3Region}"`)
    await writeFile(envPath, envContent)
  }

  // Update API .env.test with S3 test credentials
  const envTestPath = `${apiPath}/.env.test`
  if (await fileExists(envTestPath)) {
    let envTestContent = await readFile(envTestPath, 'utf8')
    envTestContent = envTestContent
      .replace(/# S3_ENDPOINT=.*$/m, `S3_ENDPOINT="http://localhost:9000"`)
      .replace(/# S3_ACCESS_KEY=.*$/m, `S3_ACCESS_KEY="minioadmin"`)
      .replace(/# S3_SECRET_KEY=.*$/m, `S3_SECRET_KEY="minioadmin"`)
      .replace(/# S3_BUCKET=.*$/m, `S3_BUCKET="test-uploads"`)
      .replace(/# S3_REGION=.*$/m, `S3_REGION="us-east-1"`)
    await writeFile(envTestPath, envTestContent)
  }

  // Update web .env to enable storage
  const webEnvPath = `${webPath}/.env`
  if (await fileExists(webEnvPath)) {
    let webEnvContent = await readFile(webEnvPath, 'utf8')
    webEnvContent = webEnvContent.replace(/VITE_STORAGE_ENABLED=.*$/m, 'VITE_STORAGE_ENABLED="true"')
    await writeFile(webEnvPath, webEnvContent)
  }
}
