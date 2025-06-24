/**
 * Resources
 */
import { ApiProperty } from '@nestjs/swagger'
import { IsArray, Matches } from 'class-validator'

/**
 * Declaration
 */
export class UpdateEntityUsersDto {
  @ApiProperty({
    description: 'List of user IDs to associate with the entity',
    example: ['cmagp5dy70001t84nzb9t39j6', 'cmagp5dy70001t84nzb9t39j7'],
    type: [String]
  })
  @IsArray()
  @Matches(/^c[a-z0-9]{20,}$/, { each: true, message: 'each value in userIds must be a valid CUID' })
  userIds: string[]
}
