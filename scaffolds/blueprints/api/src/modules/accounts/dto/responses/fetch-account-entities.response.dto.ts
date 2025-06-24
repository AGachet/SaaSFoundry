import { PaginatedResponseDto } from '@common/dto/responses/pagination.response.dto'
import { ApiProperty } from '@nestjs/swagger'
import { EntityWithOrganizationDto } from './fetch_account.response.dto'

export class FetchAccountEntitiesResponseDto extends PaginatedResponseDto<EntityWithOrganizationDto> {
  @ApiProperty({
    description: 'List of entities',
    type: [EntityWithOrganizationDto],
    isArray: true
  })
  items: EntityWithOrganizationDto[]
}
