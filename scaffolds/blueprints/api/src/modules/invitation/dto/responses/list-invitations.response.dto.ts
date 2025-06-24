/**
 * Resources
 */
import { ApiProperty } from '@nestjs/swagger'

/**
 * Declaration
 */
export class InvitationAccountDto {
  @ApiProperty({
    description: 'Account ID',
    example: 'clb3x5jqw0000356grby2a5bj'
  })
  id: string

  @ApiProperty({
    description: 'Account name',
    example: 'Main account'
  })
  name: string
}

export class InvitationEntityDto {
  @ApiProperty({
    description: 'Entity ID',
    example: 'clb3x5jqw0000356grby2a5bj'
  })
  id: string

  @ApiProperty({
    description: 'Entity name',
    example: 'Entity name'
  })
  name: string
}

export class InvitationRoleDto {
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
}

export class InvitationListItemDto {
  @ApiProperty({
    description: 'Invitation ID',
    example: 'clb3x5jqw0000356grby2a5bj'
  })
  id: string

  @ApiProperty({
    description: 'Inviter user ID',
    example: 'clb3x5jqw0000356grby2a5bj'
  })
  inviterUserId: string

  @ApiProperty({
    description: 'Invitee user ID',
    example: 'clb3x5jqw0000356grby2a5bj',
    required: false
  })
  inviteeUserId?: string

  @ApiProperty({
    description: 'Invitee email',
    example: 'user@example.com'
  })
  inviteeUserEmail: string

  @ApiProperty({
    description: 'Invitation status',
    example: 'SENT',
    enum: ['SENT', 'EXPIRED', 'ACCEPTED']
  })
  status: string

  @ApiProperty({
    description: 'Invitation date',
    example: '2023-01-01T00:00:00.000Z'
  })
  invitedAt: Date

  @ApiProperty({
    description: 'Acceptance date',
    example: '2023-01-01T00:00:00.000Z',
    required: false
  })
  acceptedAt?: Date

  @ApiProperty({
    description: 'Accounts linked to the invitation',
    type: [InvitationAccountDto]
  })
  accounts: InvitationAccountDto[]

  @ApiProperty({
    description: 'Entities linked to the invitation',
    type: [InvitationEntityDto]
  })
  entities: InvitationEntityDto[]

  @ApiProperty({
    description: 'Roles linked to the invitation',
    type: [InvitationRoleDto]
  })
  roles: InvitationRoleDto[]
}

export class ListInvitationsResponseDto {
  @ApiProperty({
    description: 'List of invitations',
    type: [InvitationListItemDto]
  })
  invitations: InvitationListItemDto[]
}
