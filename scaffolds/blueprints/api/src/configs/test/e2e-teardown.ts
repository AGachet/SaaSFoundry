import { execSync } from 'child_process'

const isVerbose = process.env.E2E_VERBOSE === 'true'
const isCI = process.env.CI === 'true'
const execOptions = { stdio: isVerbose ? ('inherit' as const) : ('pipe' as const) }

export default async function () {
  console.log('\n🧹 Cleaning Test Environment')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (isCI) {
    console.log('🛑 CI environment detected, skipping docker-compose shutdown.')
    return
  }

  if (process.exitCode === undefined || process.exitCode === 0) {
    try {
      console.log('\n• Stopping containers...')
      console.log('  ↳ Running cleanup')
      execSync('docker-compose -f docker-compose.db-test.yml down -v', execOptions)
      console.log('  ✓ Containers removed')

      console.log('\n✨ Test environment cleaned successfully')
    } catch (error) {
      console.log('  ❌ Failed to stop containers')
      console.error(error)
      process.exit(1)
    }
  } else {
    console.log('\n❌ Tests failed - Debug information:')
    console.log('  • Test environment is preserved for debugging')
    console.log('  • To clean up manually:')
    console.log('    docker-compose -f docker-compose.db-test.yml down -v')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}
