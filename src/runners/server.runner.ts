import { exec } from 'shelljs'

import { getHuskySetupCommand, openTerminal } from './terminal.runner'

/**
 * Waits for a server to be ready by checking its health endpoint
 * @param url The health endpoint URL to check
 * @param timeout Maximum time to wait in milliseconds
 * @returns Promise that resolves when the server is ready
 */
export async function waitForServer(url: string, timeout: number = 30000): Promise<void> {
  const startTime = Date.now()
  const checkInterval = 1000 // Check every second

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch {
      // Server not ready yet, continue waiting
    }
    await new Promise((resolve) => setTimeout(resolve, checkInterval))
  }

  throw new Error(`Server at ${url} did not become ready within ${timeout}ms`)
}

/**
 * Starts the backend server in a new terminal tab
 */
export async function startBackend(projectName: string, isMonorepo: boolean, newTerminal: boolean = false): Promise<void> {
  const apiPath = isMonorepo ? 'apps/api' : `apps/${projectName}-api`

  if (!newTerminal) {
    exec(`cd ${apiPath} && npm run dev`)
    return
  }

  const success = await openTerminal(apiPath, {
    command: getHuskySetupCommand('npm run dev'),
    description: 'Starting backend in new terminal...'
  })

  if (!success) {
    throw new Error('Failed to start backend in new terminal tab')
  }
}

/**
 * Starts the frontend server in a new terminal tab
 */
export async function startFrontend(projectName: string, isMonorepo: boolean, newTerminal: boolean = false): Promise<void> {
  const webPath = isMonorepo ? 'apps/web' : `apps/${projectName}-web`

  if (!newTerminal) {
    exec(`cd ${webPath} && npm run dev`)
    return
  }

  const success = await openTerminal(webPath, {
    command: getHuskySetupCommand('npm run dev'),
    description: 'Starting frontend in new terminal...'
  })

  if (!success) {
    throw new Error('Failed to start frontend in new terminal tab')
  }
}
