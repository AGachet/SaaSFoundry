import { ApiProperty } from '@nestjs/swagger'

export class UpdateAccountStatusResponseDto {
  @ApiProperty({ description: 'Account ID' })
  id: string

  @ApiProperty({ description: 'Account name' })
  name: string

  @ApiProperty({ description: 'Account active status' })
  isActive: boolean
}
