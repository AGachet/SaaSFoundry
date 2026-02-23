/**
 * Resources
 */
import { Injectable } from '@nestjs/common'
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'

/**
 * Dependencies
 */
import { Logger } from '@common/services/logger/logger.service'
import { EnvConfig } from '@configs/env/services/env.service'

/**
 * Declaration
 */
@Injectable()
export class StorageService {
  private readonly s3Client: S3Client
  private readonly bucket: string

  constructor(
    private readonly env: EnvConfig,
    private readonly logger: Logger
  ) {
    const endpoint = this.env.get('S3_ENDPOINT')
    const region = this.env.get('S3_REGION')
    this.bucket = this.env.get('S3_BUCKET')

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: this.env.get('S3_ACCESS_KEY'),
        secretAccessKey: this.env.get('S3_SECRET_KEY')
      },
      forcePathStyle: true
    })

    this.logger.debug(`Storage service initialized with endpoint: ${endpoint}, bucket: ${this.bucket}`, 'StorageService')
  }

  /**
   * Build a structured S3 key for organized file storage
   * Pattern: {accountId}/{resourceType}/{resourceId}/{category}/{filename}
   */
  buildKey(accountId: string, resourceType: string, resourceId: string, category: string, filename: string): string {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const timestamp = Date.now()
    return `${accountId}/${resourceType}/${resourceId}/${category}/${timestamp}-${sanitizedFilename}`
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(key: string, body: Buffer, contentType: string): Promise<string> {
    this.logger.debug(`Uploading file to S3: ${key}`, 'StorageService')

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType
        })
      )

      const fileUrl = `${this.env.get('S3_ENDPOINT')}/${this.bucket}/${key}`
      this.logger.debug(`File uploaded successfully: ${fileUrl}`, 'StorageService')
      return fileUrl
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to upload file to S3 [bucket=${this.bucket}, key=${key}]: ${message}`, 'StorageService')
      throw new Error(`Failed to upload file: ${message}`)
    }
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    this.logger.debug(`Deleting file from S3: ${key}`, 'StorageService')

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key
        })
      )

      this.logger.debug(`File deleted successfully: ${key}`, 'StorageService')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.error(`Failed to delete file from S3 [bucket=${this.bucket}, key=${key}]: ${message}`, 'StorageService')
      throw new Error(`Failed to delete file: ${message}`)
    }
  }

  /**
   * Extract S3 key from a full URL
   */
  extractKeyFromUrl(url: string): string | null {
    const prefix = `${this.env.get('S3_ENDPOINT')}/${this.bucket}/`
    if (url.startsWith(prefix)) {
      return url.substring(prefix.length)
    }
    return null
  }
}
