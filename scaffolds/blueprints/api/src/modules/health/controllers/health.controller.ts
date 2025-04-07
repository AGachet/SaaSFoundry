/**
 * Resources
 */
import { Controller, Get } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger'

/**
 * Dependencies
 */
import { HealthService } from '@modules/health/services/health.service'

/**
 * Type
 */
import type { HealthCheckResult } from '@nestjs/terminus'

/**
 * Declaration
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Check API health status',
    description: 'Returns the health status of various components of the application including database connection, memory usage, and other critical services.'
  })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          memory: { status: 'up', details: { heapUsed: '150MB' } }
        },
        error: {},
        details: {
          database: { status: 'up' },
          memory: { status: 'up', details: { heapUsed: '150MB' } }
        }
      }
    }
  })
  @ApiResponse({ status: 503, description: 'Service unavailable - One or more components are unhealthy' })
  check(): Promise<HealthCheckResult> {
    return this.healthService.runHealthChecks()
  }
}
