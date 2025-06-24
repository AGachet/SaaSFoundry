import { PaginationRequestDto } from '@common/dto/requests/pagination.request.dto'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator'

export enum EntityOrderBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  NAME = 'name',
  ORGANIZATION_NAME = 'organizationName'
}

export class FetchAccountEntitiesDto extends PaginationRequestDto {
  @ApiProperty({
    description: 'Search term to filter entities',
    example: 'company',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string

  @ApiProperty({
    description: 'Filter by user IDs (entities with these users)',
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined
    return Array.isArray(value) ? value : [value]
  })
  userIds?: string[]

  @ApiProperty({
    description: 'Filter by active status',
    type: Boolean,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  isActive?: boolean

  @ApiProperty({
    description: 'Include users that are not active',
    type: Boolean,
    default: false,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  includeInactiveUsers?: boolean = false

  @ApiProperty({
    description: 'Order by field',
    enum: EntityOrderBy,
    default: EntityOrderBy.CREATED_AT,
    required: false
  })
  @IsOptional()
  @IsEnum(EntityOrderBy)
  orderBy?: EntityOrderBy = EntityOrderBy.CREATED_AT
}
