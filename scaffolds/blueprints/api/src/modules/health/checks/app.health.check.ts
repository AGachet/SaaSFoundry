/**
 * Resources
 */
import { Injectable } from '@nestjs/common'
import { HealthIndicatorResult, HealthIndicatorStatus } from '@nestjs/terminus'

/**
 * Declaration
 */
@Injectable()
export class AppHealthCheck {
  async isHealthy(): Promise<HealthIndicatorResult> {
    return {
      app: {
        status: 'up' as HealthIndicatorStatus,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      }
    }
  }
}
