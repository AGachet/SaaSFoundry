import { PaginatedResponseDto } from '@common/dto/responses/pagination.response.dto'
import { ApiProperty } from '@nestjs/swagger'
import { AccountUserDto } from './fetch_account.response.dto'

export class FetchAccountUsersResponseDto extends PaginatedResponseDto<AccountUserDto> {
  @ApiProperty({
    description: 'Users data',
    type: [AccountUserDto],
    isArray: true
  })
  items: AccountUserDto[]
}
