/**
 * Resources
 */
import { ApiProperty } from '@nestjs/swagger'

/**
 * Declaration
 */
export class InvitationResponseDto {
  @ApiProperty({
    description: 'Friendly message indicating the status of the invitation',
    example: 'Invitation sent successfully. The user will receive an email with instructions to join.'
  })
  message: string

  @ApiProperty({
    description: 'Invitation token (only visible in development and test environments)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false
  })
  invitationToken?: string
}
