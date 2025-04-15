/**
 * Resources
 */
import { Injectable } from '@nestjs/common'
import { z } from 'zod'

/**
 * Type
 */
import type { StringValue } from 'ms'
type EnvConfigType = z.infer<typeof EnvConfig.schema>

/**
 * Declaration
 */
@Injectable()
export class EnvConfig {
  private static instance: EnvConfig | null = null
  private readonly config: EnvConfigType

  static readonly schema = z.object({
    // Server Configuration
    PORT: z.string().transform(Number).default('3500'),
    FRONTEND_URL: z.string().url(),

    // Database Configuration
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url(),

    // API Configuration
    API_PREFIX: z.string().default('/api'),
    NODE_ENV: z.enum(['development', 'production', 'test']),

    // JWT Configuration
    JWT_AUTH_EXPIRES_IN: z.string().refine((val): val is StringValue => true),
    JWT_REFRESH_EXPIRES_IN: z.string().refine((val): val is StringValue => true),
    JWT_CREATE_ACCOUNT_EXPIRES_IN: z.string().refine((val): val is StringValue => true),
    JWT_RESET_PASSWORD_EXPIRES_IN: z.string().refine((val): val is StringValue => true),

    JWT_SECRET_AUTH: z.string().min(process.env.NODE_ENV === 'test' ? 1 : 32),
    JWT_SECRET_REFRESH: z.string().min(process.env.NODE_ENV === 'test' ? 1 : 32),
    JWT_SECRET_CONFIRM_ACCOUNT: z.string().min(process.env.NODE_ENV === 'test' ? 1 : 32),
    JWT_SECRET_RESET_PASSWORD: z.string().min(process.env.NODE_ENV === 'test' ? 1 : 32),

    // MailerSend Configuration
    // TODO mailer-service-active: MAILERSEND_API_KEY: z.string(),
    // TODO mailer-service-active: MAILERSEND_SENDER_EMAIL: z.string().email(),
    // TODO mailer-service-active: MAILERSEND_SENDER_NAME: z.string(),

    // Log Configuration
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_DIR: z.string().default('logs')
  })

  constructor() {
    if (EnvConfig.instance) return EnvConfig.instance
    this.config = this.validate()
    EnvConfig.instance = this
  }

  private validate(): EnvConfigType {
    try {
      return EnvConfig.schema.parse(process.env)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const missingVariables = error.errors.map((err) => err.path.join('.'))
        console.error(`❌ Environment validation failed:\n${missingVariables.join('\n')}`)
        throw new Error(`Environment validation failed:\n${missingVariables.join('\n')}`)
      }
      throw error
    }
  }

  // Get an environment variable by key
  get<K extends keyof EnvConfigType>(key: K): EnvConfigType[K] {
    return this.config[key]
  }
}
