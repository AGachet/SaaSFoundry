import { ApiProperty } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import { IsEmail } from 'class-validator'

export class RequestPasswordResetDto {
  @ApiProperty({
    description: 'Email address of the user requesting password reset',
    example: 'user@example.com',
    format: 'email'
  })
  @Transform(({ value }) => value?.toLowerCase())
  @IsEmail({}, { message: 'Invalid email format' })
  email: string
}
