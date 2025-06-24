/**
 * Resources
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OrganizationType } from '@prisma/client'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * Declaration
 */
export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation'
  })
  @IsString()
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name: string

  @ApiProperty({
    description: 'Organization type',
    example: 'COMPANY',
    enum: OrganizationType
  })
  @IsEnum(OrganizationType, { message: 'Type must be COMPANY, ASSOCIATION, or COMMUNITY' })
  type: OrganizationType

  @ApiProperty({
    description: 'Account ID that this organization belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  accountId: string

  @ApiPropertyOptional({
    description: 'Organization description',
    example: 'A leading technology company',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description must not exceed 255 characters' })
  description?: string

  @ApiPropertyOptional({
    description: 'Organization website',
    example: 'https://www.acme.com',
    required: false
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Website must not exceed 100 characters' })
  website?: string
}
