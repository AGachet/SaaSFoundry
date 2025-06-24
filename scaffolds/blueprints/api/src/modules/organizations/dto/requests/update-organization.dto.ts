/**
 * Resources
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { OrganizationType } from '@prisma/client'
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * Declaration
 */
export class UpdateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Corporation'
  })
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Name must not exceed 100 characters' })
  name?: string

  @ApiProperty({
    description: 'Organization type',
    example: 'COMPANY',
    enum: OrganizationType
  })
  @IsOptional()
  @IsEnum(OrganizationType, { message: 'Type must be COMPANY, ASSOCIATION, or COMMUNITY' })
  type?: OrganizationType

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
