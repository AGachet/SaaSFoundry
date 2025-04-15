/**
 * Resources
 */
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import chalk from 'chalk'
import cookieParser from 'cookie-parser'
import 'dotenv/config'

/**
 * Dependencies
 */
import { GlobalExceptionFilter } from '@common/filters/global-exception.filter'
import { Logger } from '@common/services/logger/logger.service'
import { EnvConfig } from '@configs/env/services/env.service'
import { AppModule } from './app.module'
import { ApiDocsService } from './modules/api-docs/services/api-docs.service'

/**
 * Declaration
 */
const bootstrap = async () => {
  const app = await NestFactory.create(AppModule)
  const env = app.get(EnvConfig)
  const logger = app.get(Logger)

  app.setGlobalPrefix(env.get('API_PREFIX'))
  app.useGlobalFilters(new GlobalExceptionFilter(logger))
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
  app.use(cookieParser())

  // Generate OpenAPI documentation in development mode
  let docsGenerated = false
  if (env.get('NODE_ENV') === 'development') {
    try {
      const apiDocsService = app.get(ApiDocsService)
      apiDocsService.generateDocumentation(app)
      docsGenerated = apiDocsService.isDocumentGenerated()
    } catch (error) {
      logger.error(`Failed to generate API documentation: ${error.message}`)
    }
  }

  await app.listen(env.get('PORT'))

  logger.log(chalk.green('✨ Application is running on: ') + chalk.yellow(`[http://localhost:${env.get('PORT')}]`) + chalk.green(' ✨'))

  if (env.get('NODE_ENV') === 'development' && docsGenerated) {
    logger.log(chalk.green('📚 API Documentation available at: ') + chalk.yellow(`[http://localhost:${env.get('PORT')}/api/docs]`) + chalk.green(' 📚'))
  }
}

bootstrap().catch((error) => {
  console.error(`Failed to start application: ${error}`)
  process.exit(1)
})
