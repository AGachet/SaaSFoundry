import { ApiProperty } from '@nestjs/swagger'

export class AccountDto {
  @ApiProperty({
    description: 'Account unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string

  @ApiProperty({
    description: 'Account name',
    example: 'Main account'
  })
  name: string

  @ApiProperty({
    description: 'Account description',
    example: 'This is the main account for managing finances',
    required: false,
    nullable: true
  })
  description: string | null

  @ApiProperty({
    description: 'Account active status',
    example: true
  })
  isActive: boolean
}

export class OrganizationDto {
  @ApiProperty({
    description: 'Organization unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string

  @ApiProperty({
    description: 'Organization name',
    example: 'ACME Corporation'
  })
  name: string
}

export class PeopleDto {
  @ApiProperty({
    description: 'First name',
    example: 'John',
    nullable: true
  })
  firstname: string | null

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
    nullable: true
  })
  lastname: string | null
}

export class EntityDto {
  @ApiProperty({
    description: 'Entity unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string

  @ApiProperty({
    description: 'Entity name',
    example: 'Finance Department'
  })
  name: string

  @ApiProperty({
    description: 'Entity active status',
    example: true
  })
  isActive: boolean

  @ApiProperty({
    description: 'Account ID this entity belongs to',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  accountId: string

  @ApiProperty({
    description: 'Organization information',
    type: OrganizationDto,
    nullable: true
  })
  organization: OrganizationDto | null
}

export class MeResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  userId: string

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com'
  })
  email: string

  @ApiProperty({
    description: 'User personal information',
    type: PeopleDto
  })
  people: PeopleDto

  @ApiProperty({
    description: 'User roles',
    example: ['USER', 'ADMIN', 'TESTER'],
    isArray: true
  })
  roles: string[]

  @ApiProperty({
    description: 'Accessible modules for the user',
    example: ['USER_ACCOUNT_PASSWORD_RECOVERY', 'USER_ACCOUNT_CREATION'],
    isArray: true
  })
  modules: string[]

  @ApiProperty({
    description: 'User permissions',
    example: ['USER_ACCOUNT_CREATE_OWN', 'PASSWORD_RECOVERY_LINK_REQUEST_OWN', 'PASSWORD_RECOVERY_RESET_OWN'],
    isArray: true
  })
  permissions: string[]

  @ApiProperty({
    description: 'User accounts',
    type: [AccountDto]
  })
  accounts: AccountDto[]

  @ApiProperty({
    description: 'User entities',
    type: [EntityDto]
  })
  entities: EntityDto[]

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-03-06T12:00:00.000Z',
    type: Date
  })
  createdAt: Date
}
