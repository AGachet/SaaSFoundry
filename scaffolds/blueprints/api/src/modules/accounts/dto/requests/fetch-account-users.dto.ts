import { PaginationRequestDto } from '@common/dto/requests/pagination.request.dto'
import { ApiProperty } from '@nestjs/swagger'
import { Transform, Type } from 'class-transformer'
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'

export enum UserOrderBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  NAME = 'name',
  LASTNAME = 'lastname'
}

export class FetchAccountUsersDto extends PaginationRequestDto {
  @ApiProperty({
    description: 'Search term to filter users',
    example: 'john',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string

  @ApiProperty({
    description: 'Filter by role IDs',
    type: [Number],
    required: false
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined
    return Array.isArray(value) ? value : [value]
  })
  roleIds?: number[]

  @ApiProperty({
    description: 'Filter by entity IDs',
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  @Type(() => String)
  @Transform(({ value }) => {
    if (value === undefined || value === null) return undefined
    return Array.isArray(value) ? value : [value]
  })
  entityIds?: string[]

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
    description: 'Order by field',
    enum: UserOrderBy,
    default: UserOrderBy.CREATED_AT,
    required: false
  })
  @IsOptional()
  @IsEnum(UserOrderBy)
  orderBy?: UserOrderBy = UserOrderBy.CREATED_AT

  @ApiProperty({
    description: 'Include users linked directly to the account',
    type: Boolean,
    default: true,
    required: false
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  })
  includeDirectUsers?: boolean = true
}
