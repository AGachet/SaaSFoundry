/**
 * Resources
 */
import { ApiProperty } from '@nestjs/swagger'

/**
 * Declaration
 */
export class PeopleDto {
  @ApiProperty({
    description: 'People ID',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string

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

export class AccountUserDto {
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

  @ApiProperty({
    description: 'User personal information',
    type: PeopleDto,
    nullable: true
  })
  people: PeopleDto | null
}

export class UpdateAccountUsersResponseDto {
  @ApiProperty({
    description: 'The ID of the account',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
  })
  id: string

  @ApiProperty({ description: 'Account name' })
  name: string

  @ApiProperty({
    description: 'List of users linked to the account',
    type: [AccountUserDto]
  })
  users: AccountUserDto[]
}
