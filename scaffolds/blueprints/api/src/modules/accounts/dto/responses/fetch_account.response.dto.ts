import { ApiProperty } from '@nestjs/swagger'

export class OrganizationDto {
  @ApiProperty({
    description: 'Organization ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string

  @ApiProperty({
    description: 'Organization name',
    example: 'ACME Corporation'
  })
  name: string
}

export class EntityWithOrganizationDto {
  @ApiProperty({
    description: 'Entity ID',
    example: 'cmagp5dy70001t84nzb9t39j8'
  })
  id: string

  @ApiProperty({
    description: 'Entity name',
    example: 'Main Office'
  })
  name: string

  @ApiProperty({
    description: 'Associated organization',
    type: OrganizationDto,
    required: false
  })
  organization: OrganizationDto | null
}

export class AccountUserDto {
  @ApiProperty({
    description: 'User ID',
    example: 'cmagp5dy70001t84nzb9t39j6'
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

  @ApiProperty({
    description: 'User profile information',
    required: false,
    example: {
      id: 'cmagp5dy70001t84nzb9t39j7',
      firstname: 'John',
      lastname: 'Doe'
    }
  })
  people: {
    id: string
    firstname: string | null
    lastname: string | null
  } | null

  @ApiProperty({
    description: 'User roles',
    example: [
      {
        id: 1,
        name: 'Admin'
      }
    ]
  })
  roles: {
    id: number
    name: string
  }[]

  @ApiProperty({
    description: 'Entities the user is linked to',
    type: [EntityWithOrganizationDto],
    example: [
      {
        id: 'cmagp5dy70001t84nzb9t39j8',
        name: 'Main Office',
        organization: {
          id: 'org123',
          name: 'Acme Corp'
        }
      }
    ]
  })
  entities: EntityWithOrganizationDto[]

  @ApiProperty({
    description: 'Whether the user is directly linked to the account',
    example: true
  })
  isDirectlyLinked: boolean

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00.000Z'
  })
  updatedAt: Date
}

export class AccountRoleDto {
  @ApiProperty({
    description: 'Role ID',
    example: 1
  })
  id: number

  @ApiProperty({
    description: 'Role name',
    example: 'Admin'
  })
  name: string

  @ApiProperty({
    description: 'Role description',
    example: 'Administrator with full access',
    required: false
  })
  description: string | null

  @ApiProperty({
    description: 'Role active status',
    example: true
  })
  isActive: boolean

  @ApiProperty({
    description: 'Whether the role is global',
    example: false
  })
  isGlobal: boolean

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00.000Z'
  })
  updatedAt: Date
}

export class CollectionResponseDto<T> {
  @ApiProperty({
    description: 'Total number of items in the collection'
  })
  count: number

  @ApiProperty({
    description: 'Collection items',
    isArray: true
  })
  values: T[]
}

export class FetchAccountDeepResponseDto {
  @ApiProperty({
    description: 'Account ID',
    example: 'cmagp5dy70001t84nzb9t39j6'
  })
  id: string

  @ApiProperty({
    description: 'Account name',
    example: 'Acme Corp'
  })
  name: string

  @ApiProperty({
    description: 'Account description',
    example: 'Main account for Acme Corporation',
    required: false
  })
  description: string | null

  @ApiProperty({
    description: 'Account active status',
    example: true
  })
  isActive: boolean

  @ApiProperty({
    description: 'Creation date',
    example: '2024-01-01T00:00:00.000Z'
  })
  createdAt: Date

  @ApiProperty({
    description: 'Last update date',
    example: '2024-01-01T00:00:00.000Z'
  })
  updatedAt: Date

  @ApiProperty({
    description: 'Account users',
    type: CollectionResponseDto<AccountUserDto>
  })
  users: CollectionResponseDto<AccountUserDto>

  @ApiProperty({
    description: 'Account entities',
    type: CollectionResponseDto<EntityWithOrganizationDto>
  })
  entities: CollectionResponseDto<EntityWithOrganizationDto>

  @ApiProperty({
    description: 'Account roles',
    type: CollectionResponseDto<AccountRoleDto>
  })
  roles: CollectionResponseDto<AccountRoleDto>
}
