/**
 * Resources
 */
import { ApiProperty } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator'
import { OrganizationType } from '@/generated/prisma/client'

/**
 * Nested DTO for inline organization creation
 */
export class CreateOrganizationInlineDto {
  @ApiProperty({ description: 'Name of the organization', example: 'Acme Corp' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string

  @ApiProperty({ description: 'Type of organization', enum: OrganizationType, example: 'COMPANY' })
  @IsEnum(OrganizationType)
  type: OrganizationType

  @ApiProperty({ description: 'Description of the organization', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string

  @ApiProperty({ description: 'Website URL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  website?: string
}

/**
 * Declaration
 */
export class CreateEntityDto {
  @ApiProperty({
    description: 'The name of the entity. If omitted, defaults to the organization name.',
    example: 'Finance Department',
    required: false
  })
  @IsString()
  @IsOptional()
  name?: string

  @ApiProperty({
    description: 'The description of the entity',
    example: 'Handles all financial operations',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({
    description: 'The ID of an existing organization to link to',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    required: false
  })
  @IsOptional()
  @IsString()
  organizationId?: string

  @ApiProperty({
    description: 'Inline organization data to create along with the entity',
    type: CreateOrganizationInlineDto,
    required: false
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrganizationInlineDto)
  organization?: CreateOrganizationInlineDto

  @ApiProperty({
    description: 'The ID of the account this entity belongs to',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
  })
  @IsNotEmpty()
  accountId: string
}
