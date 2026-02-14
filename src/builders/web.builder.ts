import { copy } from 'fs-extra'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'
import { exec } from 'shelljs'

import { blueprintsPath, CreateWebAppParams, overlaysPath } from '../types'
import { fileExists, validateProjectName } from '../utils'

export async function createWebApp({ isMonorepo, projectName, projectDescription, frontendRepoUrl, mainBranch }: CreateWebAppParams) {
  validateProjectName(projectName)

  // Create the WEB app directory
  const webPath = isMonorepo ? 'apps/web' : `apps/${projectName}-web`

  await copy(resolve(blueprintsPath, 'web'), webPath)
  if (!isMonorepo) await copy(resolve(overlaysPath, 'multirepo/web'), webPath, { overwrite: true })
  else await copy(resolve(overlaysPath, 'monorepo/web'), webPath, { overwrite: true })

  // Update package.json
  const packageJsonPath = `${webPath}/package.json`
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'))
  packageJson.name = `${projectName}-web`
  packageJson.description = projectDescription
  packageJson.repository.url = frontendRepoUrl || 'https://github.com/agachet/saasfoundry.git'
  packageJson.keywords = [projectName, 'saasfoundry', 'frontend', 'react', 'vite']
  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
  await exec(`npm install --prefix ${webPath} > /dev/null 2>&1`)

  // Update Docker network name in docker-compose.yml
  const dockerComposePath = `${webPath}/docker-compose.yml`
  if (await fileExists(dockerComposePath)) {
    let dockerComposeContent = await readFile(dockerComposePath, 'utf8')
    dockerComposeContent = dockerComposeContent.replace(/saasfoundry-network/g, `${projectName}-network`).replace(/saasfoundry-web/g, `${projectName}-web`)
    await writeFile(dockerComposePath, dockerComposeContent)
  }

  // Update network name in GitHub Actions deployment.yml
  const deploymentYmlPath = `${webPath}/.github/workflows/deployment.yml`
  if (await fileExists(deploymentYmlPath)) {
    let deploymentYmlContent = await readFile(deploymentYmlPath, 'utf8')
    deploymentYmlContent = deploymentYmlContent.replace(/saasfoundry-network/g, `${projectName}-network`)
    await writeFile(deploymentYmlPath, deploymentYmlContent)
  }

  // Initialize Git repository
  if (!isMonorepo) {
    await exec(`git init ${webPath} > /dev/null 2>&1`)
    await exec(`git -C ${webPath} checkout -b ${mainBranch} > /dev/null 2>&1`)
    if (frontendRepoUrl) await exec(`git -C ${webPath} remote add origin ${frontendRepoUrl} > /dev/null 2>&1`)
    await exec(`git -C ${webPath} add . > /dev/null 2>&1`)
    await exec(`git -C ${webPath} commit -m "Initial commit" > /dev/null 2>&1`)
  }

  return true
}
