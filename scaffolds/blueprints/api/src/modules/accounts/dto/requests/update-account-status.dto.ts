import { ApiProperty } from '@nestjs/swagger'
import { IsBoolean, IsNotEmpty } from 'class-validator'

export class UpdateAccountStatusDto {
  @ApiProperty({
    description: 'New account status',
    example: true,
    type: Boolean
  })
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean
}
