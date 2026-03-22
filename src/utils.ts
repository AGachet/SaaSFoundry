import crypto from 'crypto'
import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

import { DbCredentials } from './types'

/**
 * Patterns to ignore when computing file hashes for the manifest.
 * These files are either auto-generated, contain secrets, or are not managed by SaaSFoundry.
 */
const HASH_IGNORE_PATTERNS = ['node_modules', '.git', 'dist', 'build', '.next', '.turbo', 'coverage', '.env', '.env.test', 'package-lock.json', '.saasfoundry.json', '.DS_Store']

/**
 * Check if a file path should be ignored for hash computation.
 */
function shouldIgnore(filePath: string): boolean {
  const parts = filePath.split(path.sep)
  return parts.some((part) => HASH_IGNORE_PATTERNS.includes(part))
}

/**
 * Compute SHA-256 hash of a file's content.
 */
export function hashFileContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Walk a directory recursively and compute SHA-256 hashes for all tracked files.
 * Returns a map of relative file paths to their hashes.
 */
export async function computeFileHashes(dir: string): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {}

  async function walk(currentDir: string) {
    const entries = await fs.promises.readdir(currentDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)
      const relativePath = path.relative(dir, fullPath)

      if (shouldIgnore(relativePath)) continue

      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile()) {
        const content = await fs.promises.readFile(fullPath, 'utf8')
        hashes[relativePath] = hashFileContent(content)
      }
    }
  }

  await walk(dir)
  return hashes
}

/**
 * Required Node.js major version for generated projects (Prisma 7 + Vite 7)
 */
const REQUIRED_NODE_MAJOR = 22

/**
 * Returns a shell prefix that loads nvm and switches to the required Node.js version.
 * Falls back silently if nvm is not available (the user may already have the right version).
 */
export function getNvmPrefix(): string {
  return `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use ${REQUIRED_NODE_MAJOR} --silent 2>/dev/null; `
}

/**
 * Check that the required Node.js version is available (either active or via nvm).
 * Throws with a clear message if not.
 */
export function checkNodeVersion(): void {
  const currentMajor = parseInt(process.versions.node.split('.')[0], 10)
  if (currentMajor >= REQUIRED_NODE_MAJOR) return

  // Current Node is too old — check if nvm can help
  try {
    const result = execSync(`export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm ls ${REQUIRED_NODE_MAJOR} 2>/dev/null`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    if (result && !result.includes('N/A')) return // nvm has Node 22 available
  } catch {
    // nvm not available or Node 22 not installed
  }

  throw new Error(
    `Node.js >= ${REQUIRED_NODE_MAJOR} is required (current: ${process.versions.node}).\n` +
      `Please install Node ${REQUIRED_NODE_MAJOR} via nvm:\n` +
      `  nvm install ${REQUIRED_NODE_MAJOR}\n` +
      `  nvm use ${REQUIRED_NODE_MAJOR}`
  )
}

/**
 * Validate that a project name is safe for use in shell commands and file paths
 */
export function validateProjectName(name: string): void {
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error(`Invalid project name "${name}": can only contain lowercase letters, numbers, and hyphens`)
  }
}

/**
 * Generate a secure random string for JWT secrets
 * @param length Length of the secret (default: 64)
 * @returns A secure random string
 */
export function generateJwtSecret(length: number = 64): string {
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Set default values for database credentials if they are empty
 */
export function setDefaultDbCredentials(credentials?: DbCredentials): DbCredentials | undefined {
  if (!credentials) return undefined

  // define db type first
  const dbType = credentials.dbType || 'postgresql'

  return {
    dbType,
    host: credentials.host || 'localhost',
    port: credentials.port || (dbType === 'postgresql' ? '5435' : '1433'),
    user: credentials.user || 'db_dev_user',
    password: credentials.password || 'db_dev_password',
    database: credentials.database || 'db_dev'
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK)
    return true
  } catch {
    return false
  }
}
