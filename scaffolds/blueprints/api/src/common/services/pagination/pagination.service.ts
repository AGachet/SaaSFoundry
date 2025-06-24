import { PaginationRequestDto } from '@common/dto/requests/pagination.request.dto'
import { PaginatedResponseDto, PaginationMetaDto } from '@common/dto/responses/pagination.response.dto'
import { Injectable } from '@nestjs/common'

@Injectable()
export class PaginationService {
  /**
   * Create pagination metadata based on request and total count
   */
  createPaginationMeta(paginationDto: PaginationRequestDto, total: number): PaginationMetaDto {
    const limit = paginationDto.limit ?? 10
    const current = paginationDto.page ?? 1
    const totalPages = Math.ceil(total / limit)

    return {
      pagination: {
        current,
        limit,
        total: totalPages
      },
      count: total
    }
  }

  /**
   * Create a paginated response with data and metadata
   */
  createPaginatedResponse<T>(data: T[], paginationDto: PaginationRequestDto, total: number): PaginatedResponseDto<T> {
    const meta = this.createPaginationMeta(paginationDto, total)
    return { items: data, meta }
  }

  /**
   * Calculate offset for database queries
   */
  getOffset(paginationDto: PaginationRequestDto): number {
    const page = paginationDto.page ?? 1
    const limit = paginationDto.limit ?? 10
    return (page - 1) * limit
  }
}
