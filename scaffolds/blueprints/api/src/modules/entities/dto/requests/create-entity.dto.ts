/**
 * Resources
 */
import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

/**
 * Declaration
 */
export class CreateEntityDto {
  @ApiProperty({
    description: 'The name of the entity. If omitted, defaults to the organization name.',
    example: 'Finance Department',
    required: false
  })
  @IsString()
  @IsOptional()
  name?: string

  @ApiProperty({
    description: 'The description of the entity',
    example: 'Handles all financial operations',
    required: false
  })
  @IsString()
  @IsOptional()
  description?: string

  @ApiProperty({
    description: 'The ID of the organization this entity belongs to',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
  })
  @IsNotEmpty()
  organizationId: string

  @ApiProperty({
    description: 'The ID of the account this entity belongs to',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
  })
  @IsNotEmpty()
  accountId: string
}
