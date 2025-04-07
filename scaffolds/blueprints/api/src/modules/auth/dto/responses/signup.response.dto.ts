import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class SignUpResponseDto {
  @ApiProperty({
    description: 'Registration confirmation message',
    example: 'User registration successful. Please check your email for confirmation.'
  })
  message: string

  @ApiPropertyOptional({
    description: 'Account confirmation token (only available in development environment)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  confirmationToken?: string
}
