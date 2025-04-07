/**
 * Resources
 */
import { IsString, IsNotEmpty } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * Declaration
 */
export class SignOutDto {
  @ApiProperty({
    description: 'ID of the user to sign out',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @IsString()
  @IsNotEmpty()
  userId: string
}
