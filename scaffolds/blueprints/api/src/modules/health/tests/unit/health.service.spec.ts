/**
 * Resources
 */
import { Test, TestingModule } from '@nestjs/testing'
import { HealthCheckService, HealthCheckResult, HealthIndicatorResult, HealthIndicatorStatus } from '@nestjs/terminus'

/**
 * Dependencies
 */
import { AppHealthCheck } from '@modules/health/checks/app.health.check'
import { HealthService } from '@modules/health/services/health.service'
import { mockChalk, mockWinston } from '@configs/test/unit-mocks-glob'
import { Logger } from '@common/services/logger/logger.service'

/**
 * Mocks
 */
jest.mock('@nestjs/terminus', () => ({
  HealthCheckService: jest.fn(),
  HealthCheckResult: jest.fn(),
  HealthIndicatorResult: jest.fn(),
  HealthIndicatorStatus: jest.fn(),
  HealthCheck: () => (target: new (...args: unknown[]) => unknown) => target
}))

jest.mock('@modules/health/checks/app.health.check')
jest.mock('@common/services/logger/logger.service')

/**
 * Test Data
 */
const mockHealthResult: HealthIndicatorResult = {
  app: {
    status: 'up' as HealthIndicatorStatus,
    uptime: 123,
    timestamp: '2024-03-05T12:00:00.000Z'
  }
}

/**
 * Declaration
 */
describe('HealthService', () => {
  let service: HealthService
  let healthCheckService: jest.Mocked<HealthCheckService>
  let appHealthCheck: jest.Mocked<AppHealthCheck>
  let logger: jest.Mocked<Logger>

  beforeEach(async () => {
    // Reset global mocks
    Object.values(mockChalk).forEach((mock: jest.Mock) => mock.mockClear())
    Object.values(mockWinston.format).forEach((mock: jest.Mock) => mock.mockClear())
    mockWinston.createLogger.mockClear()

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn()
          }
        },
        {
          provide: AppHealthCheck,
          useValue: {
            isHealthy: jest.fn()
          }
        },
        {
          provide: Logger,
          useValue: {
            debug: jest.fn(),
            error: jest.fn()
          }
        }
      ]
    }).compile()

    healthCheckService = module.get(HealthCheckService)
    service = module.get<HealthService>(HealthService)
    appHealthCheck = module.get(AppHealthCheck)
    logger = module.get(Logger)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('runHealthChecks', () => {
    it('should run health checks successfully', async () => {
      const mockResult: HealthCheckResult = {
        status: 'ok',
        info: {
          app: {
            status: 'up' as HealthIndicatorStatus,
            uptime: 123,
            timestamp: '2024-03-05T12:00:00.000Z'
          }
        },
        error: {},
        details: {
          app: {
            status: 'up' as HealthIndicatorStatus,
            uptime: 123,
            timestamp: '2024-03-05T12:00:00.000Z'
          }
        }
      }

      healthCheckService.check.mockResolvedValue(mockResult)
      appHealthCheck.isHealthy.mockResolvedValue(mockHealthResult)

      const result = await service.runHealthChecks()

      expect(result).toEqual(mockResult)
      expect(logger.debug).toHaveBeenCalledWith('Running health checks...', 'HealthService')
      expect(logger.debug).toHaveBeenCalledWith('Health checks passed - Status: ok', 'HealthService')
    })

    it('should handle health check failures', async () => {
      const error = new Error('Health check failed')
      healthCheckService.check.mockRejectedValue(error)

      await expect(service.runHealthChecks()).rejects.toThrow(error)
      expect(logger.error).toHaveBeenCalledWith('Health checks failed: Health check failed', error.stack || JSON.stringify(error), 'HealthService')
    })
  })
})
