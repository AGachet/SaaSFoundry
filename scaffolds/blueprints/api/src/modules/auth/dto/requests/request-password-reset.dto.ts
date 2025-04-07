import { IsEmail } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email address of the user requesting password reset',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string
}
