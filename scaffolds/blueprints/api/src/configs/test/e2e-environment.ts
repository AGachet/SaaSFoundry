import { execSync } from 'child_process'

const isVerbose = process.env.E2E_VERBOSE === 'true'
const isCI = process.env.CI === 'true'
const execOptions = { stdio: isVerbose ? ('inherit' as const) : ('pipe' as const) }

const setupDatabase = () => {
  console.log('\n🚀 Starting E2E Tests')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (isCI) {
    console.log('🛑 CI environment detected, skipping docker-compose startup.')
  } else {
    // Start container en local uniquement
    console.log('\n• Starting test environment...')
    try {
      console.log('  ↳ Launching database container')
      execSync('docker-compose -f docker-compose.db-test.yml up -d', { stdio: 'pipe' as const })
      console.log('  ✓ Container started')
    } catch (error) {
      console.log('  ❌ Failed to start container')
      throw error
    }

    // Wait for database to be ready
    console.log('\n• Waiting for database to be ready...')
    let retries = 0
    process.stdout.write('  ↳ Checking health')

    while (retries < 30) {
      try {
        execSync('docker-compose -f docker-compose.db-test.yml ps | grep "healthy"', { stdio: 'pipe' as const })
        break
      } catch {
        process.stdout.write('.')
        retries++
        execSync('sleep 2')
      }
    }

    if (retries === 30) {
      console.log(' ❌')
      console.log('  ❌ Database failed to start (timeout)')
      throw new Error('Database failed to start')
    }
    console.log(' ✓')
  }

  // Initialize test database
  console.log('\n• Initializing database...')
  try {
    execSync('./scripts/init-test-db.sh', execOptions)
  } catch (error) {
    console.log('  ❌ Database initialization failed')
    throw error
  }
}

export default async function () {
  try {
    await setupDatabase()
  } catch (error) {
    console.log('\n❌ Failed to setup test environment')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    throw error
  }
}
