/**
 * Resources
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OrganizationType } from '@prisma/client'

/**
 * Declaration
 */
export class FetchOrganizationResponseDto {
  @ApiProperty({
    description: 'Organization unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string

  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation'
  })
  name: string

  @ApiProperty({
    description: 'Organization type',
    example: 'COMPANY',
    enum: OrganizationType
  })
  type: OrganizationType

  @ApiPropertyOptional({
    description: 'Organization description',
    example: 'A leading technology company',
    required: false,
    nullable: true
  })
  description: string | null

  @ApiPropertyOptional({
    description: 'Organization website',
    example: 'https://www.acme.com',
    required: false,
    nullable: true
  })
  website: string | null

  @ApiProperty({
    description: 'Organization creation date',
    example: '2024-03-06T12:00:00.000Z',
    type: Date
  })
  createdAt: Date

  @ApiProperty({
    description: 'Organization last update date',
    example: '2024-03-06T12:00:00.000Z',
    type: Date
  })
  updatedAt: Date
}
