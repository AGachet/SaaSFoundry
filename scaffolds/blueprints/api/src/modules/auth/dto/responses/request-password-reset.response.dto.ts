import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class RequestPasswordResetResponseDto {
  @ApiProperty({
    description: 'Confirmation message',
    example: 'Password reset instructions sent to your email'
  })
  message: string

  @ApiPropertyOptional({
    description: 'Reset token (only available in development environment)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  resetToken?: string
}
