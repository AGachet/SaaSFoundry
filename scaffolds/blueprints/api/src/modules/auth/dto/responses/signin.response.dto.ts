import { ApiProperty } from '@nestjs/swagger'

export class SignInResponseDto {
  @ApiProperty({
    description: 'Authenticated user ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  userId: string
}
