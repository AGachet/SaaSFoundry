import { copy } from 'fs-extra'
import { readFile, writeFile } from 'fs/promises'
import { resolve } from 'path'

import { overlaysPath } from '../types'
import { fileExists } from '../utils'

interface InstallAnalyticsModuleParams {
  webPath: string
}

/**
 * Install the Umami analytics module on a Web app.
 *
 * This function:
 * 1. Copies the analytics overlay module to the web app's src/lib/analytics/
 * 2. Uncomments `// TODO monitoring-active:` markers in main.tsx
 * 3. Uncomments analytics env vars in .env
 *
 * Used by both `sf new` (during initial project generation) and `sf update` (when adding the module later).
 */
export async function installAnalyticsModule({ webPath }: InstallAnalyticsModuleParams) {
  // Copy analytics overlay module
  await copy(resolve(overlaysPath, 'modules/analytics'), `${webPath}/src/lib/analytics`)

  // Uncomment analytics code in main.tsx
  const mainTsxPath = `${webPath}/src/main.tsx`
  let mainTsxContent = await readFile(mainTsxPath, 'utf8')
  mainTsxContent = mainTsxContent.replace(/\/\/ TODO monitoring-active: /g, '')
  await writeFile(mainTsxPath, mainTsxContent)

  // Uncomment analytics env vars in .env
  const webEnvPath = `${webPath}/.env`
  if (await fileExists(webEnvPath)) {
    let webEnvContent = await readFile(webEnvPath, 'utf8')
    webEnvContent = webEnvContent.replace(/# VITE_ANALYTICS_URL=""/, 'VITE_ANALYTICS_URL=""')
    webEnvContent = webEnvContent.replace(/# VITE_ANALYTICS_WEBSITE_ID=""/, 'VITE_ANALYTICS_WEBSITE_ID=""')
    await writeFile(webEnvPath, webEnvContent)
  }
}
