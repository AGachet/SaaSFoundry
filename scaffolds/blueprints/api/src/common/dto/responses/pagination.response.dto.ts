import { ApiProperty } from '@nestjs/swagger'

export class PaginationMetaDto {
  @ApiProperty({
    description: 'Pagination information',
    example: {
      current: 1,
      limit: 10,
      total: 5
    }
  })
  pagination: {
    current: number
    limit: number
    total: number
  }

  @ApiProperty({
    description: 'Total number of items',
    example: 42
  })
  count: number
}

export class PaginatedResponseDto<T> {
  @ApiProperty({
    description: 'List of items',
    isArray: true
  })
  items: T[]

  @ApiProperty({
    description: 'Pagination metadata'
  })
  meta: PaginationMetaDto
}
