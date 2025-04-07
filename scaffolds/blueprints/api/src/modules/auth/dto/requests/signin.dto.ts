/**
 * Resources
 */
import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

/**
 * Declaration
 */
export class SignInDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string

  @ApiProperty({
    description: 'User password',
    example: 'mySecurePassword123',
    minLength: 6,
    maxLength: 40
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(40, { message: 'Password must not exceed 40 characters' })
  password: string

  @ApiPropertyOptional({
    description: 'Account confirmation token (only required when validating a new account)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    maxLength: 500,
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Token is too long' })
  confirmAccountToken?: string
}
