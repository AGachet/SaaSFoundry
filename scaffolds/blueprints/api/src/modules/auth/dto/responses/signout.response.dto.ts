import { ApiProperty } from '@nestjs/swagger'

export class SignOutResponseDto {
  @ApiProperty({
    description: 'Success message',
    example: 'Successfully signed out'
  })
  message: string
}
