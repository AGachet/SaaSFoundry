/**
 * Resources
 */
import { ApiProperty } from '@nestjs/swagger'
import { Locale } from '@prisma/client'
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * Declaration
 */
export class AcceptInvitationDto {
  @ApiProperty({
    description: 'Invitation token received by email',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  })
  @IsNotEmpty()
  @IsString()
  invitationToken: string

  @ApiProperty({
    description: 'Password for the new account',
    example: 'SecureP@ssword123'
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  password: string

  @ApiProperty({
    description: 'First name of the user (can override the suggested value)',
    example: 'John',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  firstname?: string

  @ApiProperty({
    description: 'Last name of the user (can override the suggested value)',
    example: 'Doe',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  lastname?: string

  @ApiProperty({
    description: 'Preferred locale for the user (can override the suggested value)',
    enum: Locale,
    default: Locale.FR,
    required: false
  })
  @IsOptional()
  locale?: Locale
}
