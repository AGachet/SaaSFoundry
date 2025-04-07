/**
 * Resources
 */
import { Injectable, Logger, INestApplication } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { OpenAPIObject } from '@nestjs/swagger'
import { join } from 'path'

/**
 * Dependencies
 */
import { openApiConfig } from '@configs/api-docs/open-api.config'

/**
 * Declaration
 */
@Injectable()
export class ApiDocsService {
  private document: OpenAPIObject | null = null
  private readonly logger = new Logger(ApiDocsService.name)

  // Generates the OpenAPI documentation for the application
  generateDocumentation(app: INestApplication): OpenAPIObject {
    this.logger.log('Generating OpenAPI documentation...')

    try {
      const config = new DocumentBuilder()
        .setTitle(openApiConfig.title)
        .setDescription(openApiConfig.description)
        .setVersion(openApiConfig.version)
        .setContact(openApiConfig.contact.name, openApiConfig.contact.url, openApiConfig.contact.email)
        .setLicense(openApiConfig.license.name, openApiConfig.license.url)
        .addBearerAuth()
        .build()

      this.document = SwaggerModule.createDocument(app, config)

      // Create docs directory at project root
      const docsPath = join(process.cwd(), 'docs')
      const apiDocsPath = join(process.cwd(), openApiConfig.outputPath)
      const indexHtmlPath = join(docsPath, 'index.html')

      // Ensure directory exists
      if (!existsSync(docsPath)) {
        this.logger.log(`Creating directory: ${docsPath}`)
        mkdirSync(docsPath, { recursive: true })
      }

      // Write openapi.json file
      writeFileSync(apiDocsPath, JSON.stringify(this.document, null, 2))
      this.logger.log(`OpenAPI documentation generated and saved to: ${apiDocsPath}`)

      // Check if index.html exists, if not create it
      if (!existsSync(indexHtmlPath)) {
        this.logger.log(`Creating Stoplight Elements UI index.html at: ${indexHtmlPath}`)
        this.generateStoplightHtml(indexHtmlPath)
      }

      return this.document
    } catch (error) {
      this.logger.error(`Failed to generate OpenAPI documentation: ${error.message}`)
      throw error
    }
  }

  /**
   * Generates a Stoplight Elements HTML file to display the API documentation
   * @param filePath The path where the HTML file should be saved
   */
  private generateStoplightHtml(filePath: string): void {
    const html = `<!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>BillMate API Documentation</title>

        <!-- Stoplight Elements styles -->
        <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">

      </head>
      <body>
        <!-- Stoplight Elements Web Component -->
        <elements-api
          apiDescriptionUrl="./openapi.json"
          router="hash"
          layout="sidebar"
          hideExport="true"
          hideInternal="true"
        />

        <!-- Stoplight Elements script -->
        <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
      </body>
      </html>`

    writeFileSync(filePath, html)
  }

  // Returns the current OpenAPI document
  getDocument(): OpenAPIObject {
    if (!this.document) {
      this.logger.warn('OpenAPI documentation requested but not yet generated')
      throw new Error('OpenAPI documentation not generated. Call generateDocumentation() first.')
    }
    return this.document
  }

  // Checks if the OpenAPI document has been generated
  isDocumentGenerated(): boolean {
    return this.document !== null
  }
}
