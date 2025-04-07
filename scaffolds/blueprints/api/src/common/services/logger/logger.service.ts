/**
 * Dependencies
 */
import { Injectable, LoggerService } from '@nestjs/common'
import DailyRotateFile from 'winston-daily-rotate-file'
import { EnvConfig } from '@configs/env/services/env.service'
import * as winston from 'winston'
import chalk from 'chalk'

/**
 * Declaration
 */
@Injectable()
export class Logger implements LoggerService {
  private logger: winston.Logger
  private colorMap: Record<string, (text: string) => string> = {
    error: chalk.red,
    warn: chalk.yellow,
    info: chalk.green,
    debug: chalk.blue,
    verbose: chalk.cyan
  }

  constructor(private readonly env: EnvConfig) {
    this.logger = winston.createLogger({
      level: this.env.get('LOG_LEVEL'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp, context, requestId, metadata }) => {
          const color = this.colorMap[level] || chalk.white
          const pid = process.pid
          const reqId = requestId ? `[REQ_ID:${requestId}]` : ''
          const metadataStr = metadata ? `\nMetadata: ${JSON.stringify(metadata)}` : ''

          return `[${chalk.gray(timestamp)}] [PID:${pid}] ${color(level.toUpperCase())} ${reqId} [${chalk.magenta(context || 'App')}] ${message}${metadataStr}`
        })
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize())
        }),
        new DailyRotateFile({
          filename: `${this.env.get('LOG_DIR')}/application-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          format: winston.format.combine(winston.format.uncolorize(), winston.format.json())
        })
      ]
    })
  }

  log(message: string, context = 'App', requestId?: string) {
    this.logger.info(message, { context, requestId })
  }

  error(message: string, trace?: string, context = 'App', requestId?: string, status?: number) {
    const statusText = status ? `(${status} - ${Logger.getHttpStatusText(status)})` : ''
    this.logger.error(`${message} ${statusText}`, { trace, context, requestId })
  }

  warn(message: string, context = 'App', requestId?: string) {
    this.logger.warn(message, { context, requestId })
  }

  debug(message: string, context = 'App', requestId?: string) {
    this.logger.debug(message, { context, requestId })
  }

  verbose(message: string, context = 'App', requestId?: string) {
    this.logger.verbose(message, { context, requestId })
  }

  private static getHttpStatusText(status: number): string {
    return status >= 500 ? 'Internal Server Error' : status >= 400 ? 'Client Error' : status >= 300 ? 'Redirection' : status >= 200 ? 'Success' : 'Informational'
  }
}
