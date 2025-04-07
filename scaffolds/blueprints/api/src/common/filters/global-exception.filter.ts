/**
 * Resources
 */
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common'
import { Request, Response } from 'express'

/**
 * Dependencies
 */
import { Logger } from '@common/services/logger/logger.service'

/**
 * Declaration
 */
interface SanitizedData {
  [key: string]: unknown
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: Error | HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<Request>()
    const response = ctx.getResponse<Response>()

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR

    // Hide sensitive data
    const sanitizedBody = this.sanitizeRequestData(request.body)
    const requestId = Array.isArray(request.headers['x-request-id']) ? request.headers['x-request-id'][0] : request.headers['x-request-id']
    const errorMessage = exception instanceof HttpException ? JSON.stringify(exception.getResponse()) : exception.message

    // Detailed log for debugging
    this.logger.error(`Error occurred: ${errorMessage}`, exception.stack, 'GlobalExceptionFilter', requestId, status)

    // Separate log for request details
    this.logger.debug(
      `Request details - Method: ${request.method}, Path: ${request.path}, Body: ${JSON.stringify(sanitizedBody)}, Query: ${JSON.stringify(request.query)}`,
      'GlobalExceptionFilter',
      requestId
    )

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception instanceof HttpException ? exception.getResponse()['message'] || exception.message : exception.message
    })
  }

  private sanitizeRequestData(data: Record<string, unknown>): SanitizedData {
    if (!data) return data

    const sensitiveFields = ['password', 'token', 'secret', 'creditCard']
    const sanitized = { ...data }

    for (const field of sensitiveFields) {
      if (field in sanitized) sanitized[field] = '***REDACTED***'
    }

    return sanitized
  }
}
