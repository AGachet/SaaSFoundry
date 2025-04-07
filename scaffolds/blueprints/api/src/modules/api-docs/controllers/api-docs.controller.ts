/**
 * Resources
 */
import { Controller, Get, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

/**
 * Dependencies
 */
import { ApiDocsService } from '../services/api-docs.service'

/**
 * Declaration
 */
@ApiTags('Documentation')
@Controller('api/docs')
export class ApiDocsController {
  private readonly logger = new Logger(ApiDocsController.name)

  constructor(private readonly apiDocsService: ApiDocsService) {}

  @Get('openapi.json')
  @ApiOperation({
    summary: 'Get OpenAPI documentation',
    description: 'Returns the OpenAPI specification in JSON format for the API documentation'
  })
  @ApiResponse({
    status: 200,
    description: 'The OpenAPI specification in JSON format'
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error or documentation not generated'
  })
  getOpenApiJson() {
    try {
      return this.apiDocsService.getDocument()
    } catch (error) {
      this.logger.error(`Failed to get OpenAPI documentation: ${error.message}`)
      throw new HttpException('OpenAPI documentation not available', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
