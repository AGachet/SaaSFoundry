import { ApiProperty } from '@nestjs/swagger'

export class ResetPasswordResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Password successfully reset'
  })
  message: string
}
