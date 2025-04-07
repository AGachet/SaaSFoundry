/**
 * Resources
 */
import { ServeStaticModule } from '@nestjs/serve-static'
import { Module } from '@nestjs/common'
import { join } from 'path'

/**
 * Dependencies
 */
import { ApiDocsController } from '@modules/api-docs/controllers/api-docs.controller'
import { ApiDocsService } from '@modules/api-docs/services/api-docs.service'

/**
 * Declaration
 */
@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'docs'),
      serveRoot: '/api/docs',
      serveStaticOptions: {
        index: ['index.html']
      }
    })
  ],
  controllers: [ApiDocsController],
  providers: [ApiDocsService],
  exports: [ApiDocsService]
})
export class ApiDocsModule {}
