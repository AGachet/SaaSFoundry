import { ApiProperty } from '@nestjs/swagger'

export class GuestResponseDto {
  @ApiProperty({
    description: 'User roles',
    example: ['GUEST'],
    isArray: true
  })
  roles: string[]

  @ApiProperty({
    description: 'Accessible modules for the guest user',
    example: ['USER_ACCOUNT_CREATION', 'USER_ACCOUNT_LOGIN'],
    isArray: true
  })
  modules: string[]

  @ApiProperty({
    description: 'Guest user permissions',
    example: ['USER_ACCOUNT_CREATE_OWN', 'USER_ACCOUNT_LOGIN'],
    isArray: true
  })
  permissions: string[]
}
