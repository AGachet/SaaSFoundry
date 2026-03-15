/**
 * Resources
 */
import { ApiProperty } from '@nestjs/swagger'
import { Locale } from '@/generated/prisma/client'
import { Transform } from 'class-transformer'
import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator'

/**
 * Declaration
 */
export class CreateInvitationDto {
  @ApiProperty({
    description: 'Email address of the person to invite',
    example: 'john.doe@example.com'
  })
  @IsNotEmpty()
  @Transform(({ value }) => value?.toLowerCase())
  @IsEmail()
  @MaxLength(100)
  email: string

  @ApiProperty({
    description: 'Optional first name of the invited person',
    example: 'John',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  firstname?: string

  @ApiProperty({
    description: 'Optional last name of the invited person',
    example: 'Doe',
    required: false
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  lastname?: string

  @ApiProperty({
    description: 'Optional list of role IDs to assign to the invited user',
    type: [Number],
    required: false
  })
  @IsOptional()
  @IsArray()
  roleIds?: number[]

  @ApiProperty({
    description: 'Optional list of account IDs to directly link the invited user to',
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  accountIds?: string[]

  @ApiProperty({
    description: 'Optional list of entity IDs to link the invited user to',
    type: [String],
    required: false
  })
  @IsOptional()
  @IsArray()
  entityIds?: string[]

  @ApiProperty({
    description: 'Preferred locale for the invited user',
    enum: Locale,
    default: Locale.FR,
    required: false
  })
  @IsOptional()
  locale?: Locale
}
