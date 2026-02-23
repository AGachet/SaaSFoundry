/**
 * Resources
 */
import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

/**
 * Dependencies
 */
import { RequirePermissions } from '@common/decorators/require-permissions.decorator'
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '@modules/auth/guards/permissions.guard'
import { AuthService } from '@modules/auth/services/auth.service'
import { InvitationService } from '@modules/invitation/services/invitation.service'
/**
 * DTO
 */
import { SignInResponseDto } from '@modules/auth/dto/responses/signin.response.dto'
import { AcceptInvitationDto } from '@modules/invitation/dto/requests/accept-invitation.dto'
import { CreateInvitationDto } from '@modules/invitation/dto/requests/create-invitation.dto'
import { InvitationResponseDto } from '@modules/invitation/dto/responses/invitation.response.dto'
import { ListInvitationsResponseDto } from '@modules/invitation/dto/responses/list-invitations.response.dto'

/**
 * Type
 */
import type { AuthenticatedRequest } from '@common/types/authenticated-request.type'
import type { Response } from 'express'

/**
 * Declaration
 */
@ApiTags('Invitations')
@Controller('invitations')
export class InvitationController {
  constructor(
    private readonly invitationService: InvitationService,
    private readonly authService: AuthService
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(['USER_ACCOUNTS_INVITATION', 'USER_ENTITIES_INVITATION'], 'ACCOUNT_ADMINISTRATION', { requireAll: false })
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Create invitation', description: 'Create an invitation for a new user to join an account or entity.' })
  @ApiResponse({ status: 200, description: 'Invitation created successfully', type: InvitationResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - user does not have required permissions' })
  /** End -- Documentation */
  async createInvitation(@Req() req: AuthenticatedRequest, @Body() createInvitationDto: CreateInvitationDto): Promise<InvitationResponseDto> {
    return this.invitationService.createInvitation(req.user.id, createInvitationDto)
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions([], 'ACCOUNT_ADMINISTRATION')
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Get user invitations', description: 'Get all invitations sent by the authenticated user.' })
  @ApiResponse({ status: 200, description: 'List of invitations', type: ListInvitationsResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  /** End -- Documentation */
  async getUserInvitations(@Req() req: AuthenticatedRequest): Promise<ListInvitationsResponseDto> {
    return this.invitationService.getUserInvitations(req.user.id)
  }

  @Post('accept')
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Accept invitation', description: 'Accept an invitation and complete account setup.' })
  @ApiResponse({ status: 200, description: 'Invitation accepted successfully', type: SignInResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @ApiResponse({ status: 404, description: 'Invitation not found or expired' })
  /** End -- Documentation */
  async acceptInvitation(@Body() acceptInvitationDto: AcceptInvitationDto, @Res({ passthrough: true }) response: Response): Promise<SignInResponseDto> {
    const { userId, accessToken, refreshToken } = await this.invitationService.acceptInvitation(acceptInvitationDto)
    this.authService.setAuthCookies(response, accessToken, refreshToken)
    return { userId }
  }
}
