/**
 * Resources
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Locale } from '@prisma/client'
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

/**
 * Declaration
 */
export class SignUpDto {
  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
    minLength: 1
  })
  @IsString()
  @MinLength(1, { message: 'First name is required' })
  firstname: string

  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
    minLength: 1
  })
  @IsString()
  @MinLength(1, { message: 'Last name is required' })
  lastname: string

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string

  @ApiProperty({
    description: 'User password',
    example: 'NewPassword123',
    minLength: 6,
    maxLength: 40,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{8,}$'
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @MaxLength(40, { message: 'Password must not exceed 40 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number'
  })
  password: string

  @ApiPropertyOptional({
    description: 'User locale preference',
    example: 'EN',
    default: 'EN'
  })
  @IsOptional()
  @IsString()
  locale?: Locale
}
