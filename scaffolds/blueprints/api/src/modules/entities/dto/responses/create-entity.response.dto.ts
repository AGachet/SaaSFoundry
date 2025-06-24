/**
 * Resources
 */
import { ApiProperty } from '@nestjs/swagger'

/**
 * Declaration
 */
export class EntityUserDto {
  @ApiProperty({
    description: 'User ID',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
  })
  id: string

  @ApiProperty({
    description: 'User email',
    example: 'john.doe@example.com'
  })
  email: string

  @ApiProperty({
    description: 'User active status',
    example: true
  })
  isActive: boolean
}

export class EntityRoleDto {
  @ApiProperty({
    description: 'Role ID',
    example: 1
  })
  id: number

  @ApiProperty({
    description: 'Role name',
    example: 'admin'
  })
  name: string

  @ApiProperty({
    description: 'Role active status',
    example: true
  })
  isActive: boolean
}

export class CreateEntityResponseDto {
  @ApiProperty({
    description: 'The unique ID of the entity',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
  })
  id: string

  @ApiProperty({
    description: 'The name of the entity',
    example: 'Finance Department'
  })
  name: string

  @ApiProperty({
    description: 'The description of the entity',
    example: 'Handles all financial operations'
  })
  description: string

  @ApiProperty({
    description: 'Whether the entity is active',
    example: true
  })
  isActive: boolean

  @ApiProperty({
    description: 'The organization this entity belongs to',
    type: Object,
    required: false
  })
  organization?: {
    id: string
    name: string
  }

  @ApiProperty({
    description: 'The users associated with this entity',
    type: [EntityUserDto],
    required: false
  })
  users?: EntityUserDto[]

  @ApiProperty({
    description: 'The roles associated with this entity',
    type: [EntityRoleDto],
    required: false
  })
  roles?: EntityRoleDto[]

  @ApiProperty({
    description: 'The date and time when the entity was created',
    example: '2023-01-01T00:00:00.000Z'
  })
  createdAt: Date

  @ApiProperty({
    description: 'The date and time when the entity was last updated',
    example: '2023-01-01T00:00:00.000Z'
  })
  updatedAt: Date
}
