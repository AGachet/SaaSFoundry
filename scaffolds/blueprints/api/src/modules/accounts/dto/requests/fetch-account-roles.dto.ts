import { PaginationRequestDto } from '@common/dto/requests/pagination.request.dto'
import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator'

export enum RoleOrderBy {
  CREATED_AT = 'createdAt',
  NAME = 'name'
}

export class FetchAccountRolesDto extends PaginationRequestDto {
  @ApiProperty({
    description: 'Search term to filter roles',
    example: 'admin',
    required: false
  })
  @IsOptional()
  @IsString()
  search?: string

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
    enum: RoleOrderBy,
    default: RoleOrderBy.CREATED_AT,
    required: false
  })
  @IsOptional()
  @IsEnum(RoleOrderBy)
  orderBy?: RoleOrderBy = RoleOrderBy.CREATED_AT
}
