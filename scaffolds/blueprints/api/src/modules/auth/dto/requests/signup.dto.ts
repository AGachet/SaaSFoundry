/**
 * Resources
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Locale } from '@/generated/prisma/client'
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'

/**
 * Declaration
 */
export class SignUpDto {
  @ApiPropertyOptional({
    description: 'First name of the user (optional during signup)',
    example: 'John',
    required: false
  })
  @IsString()
  @IsOptional()
  firstname?: string

  @ApiPropertyOptional({
    description: 'Last name of the user (optional during signup)',
    example: 'Doe',
    required: false
  })
  @IsString()
  @IsOptional()
  lastname?: string

  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string

  @ApiProperty({
    description: 'User password',
    example: 'NewPassword123!',
    minLength: 8,
    maxLength: 40,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$'
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(40, { message: 'Password must not exceed 40 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/, {
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
