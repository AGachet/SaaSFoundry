import { ApiProperty } from '@nestjs/swagger'
import { IsString, Matches, MaxLength, MinLength } from 'class-validator'

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token received by email for password reset',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsString()
  resetPasswordToken: string

  @ApiProperty({
    description: 'New password (must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number)',
    example: 'NewPassword123',
    minLength: 6,
    maxLength: 40,
    pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d]{8,}$'
  })
  @IsString()
  @MinLength(6)
  @MaxLength(40, { message: 'Password must not exceed 40 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, {
    message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number'
  })
  password: string

  @ApiProperty({
    description: 'Confirm the new password (must match password field)',
    example: 'NewPassword123',
    minLength: 6
  })
  @IsString()
  @MinLength(6)
  confirmPassword: string
}
