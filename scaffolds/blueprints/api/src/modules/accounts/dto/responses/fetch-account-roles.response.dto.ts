import { PaginatedResponseDto } from '@common/dto/responses/pagination.response.dto'
import { ApiProperty } from '@nestjs/swagger'
import { AccountRoleDto } from './fetch_account.response.dto'

export class FetchAccountRolesResponseDto extends PaginatedResponseDto<AccountRoleDto> {
  @ApiProperty({
    description: 'List of roles',
    type: [AccountRoleDto],
    isArray: true
  })
  items: AccountRoleDto[]
}
