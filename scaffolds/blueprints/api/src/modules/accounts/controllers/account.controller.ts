/**
 * Resources
 */
import { Body, Controller, Get, Param, Patch, Query, Req, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger'

/**
 * Dependencies
 */
import { RequirePermissions } from '@common/decorators/require-permissions.decorator'
import { AccountService } from '@modules/accounts/services/account.service'
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '@modules/auth/guards/permissions.guard'

/**
 * DTO
 */
import { FetchAccountEntitiesDto } from '@modules/accounts/dto/requests/fetch-account-entities.dto'
import { FetchAccountRolesDto } from '@modules/accounts/dto/requests/fetch-account-roles.dto'
import { FetchAccountUsersDto } from '@modules/accounts/dto/requests/fetch-account-users.dto'
import { UpdateAccountStatusDto } from '@modules/accounts/dto/requests/update-account-status.dto'
import { UpdateAccountUsersDto } from '@modules/accounts/dto/requests/update-account-users.dto'

import { FetchAccountEntitiesResponseDto } from '@modules/accounts/dto/responses/fetch-account-entities.response.dto'
import { FetchAccountRolesResponseDto } from '@modules/accounts/dto/responses/fetch-account-roles.response.dto'
import { FetchAccountUsersResponseDto } from '@modules/accounts/dto/responses/fetch-account-users.response.dto'
import { FetchAccountDeepResponseDto } from '@modules/accounts/dto/responses/fetch_account.response.dto'
import { UpdateAccountStatusResponseDto } from '@modules/accounts/dto/responses/update-account-status.response.dto'
import { UpdateAccountUsersResponseDto } from '@modules/accounts/dto/responses/update-account-users.response.dto'

/**
 * Type
 */
import type { AuthenticatedRequest } from '@common/types/authenticated-request.type'

/**
 * Declaration
 */
@ApiTags('Accounts')
@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get(':id')
  @RequirePermissions([], 'ACCOUNT_ADMINISTRATION')
  @UseGuards(PermissionsGuard)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Fetch account details', description: 'Fetch detailed account information including the 5 most recent users, entities, and roles with counts.' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Detailed account information', type: FetchAccountDeepResponseDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 400, description: 'Failed to get account details' })
  /** End -- Documentation */
  async fetchAccount(@Req() req: AuthenticatedRequest, @Param('id') accountId: string): Promise<FetchAccountDeepResponseDto> {
    return this.accountService.fetchAccount(req.user.id, accountId)
  }

  @Get(':id/users')
  @RequirePermissions([], 'ACCOUNT_ADMINISTRATION')
  @UseGuards(PermissionsGuard)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Fetch account users', description: 'Fetch users linked to an account with pagination and filtering options.' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Paginated list of users', type: FetchAccountUsersResponseDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 400, description: 'Failed to fetch account users' })
  /** End -- Documentation */
  async fetchAccountUsers(@Req() req: AuthenticatedRequest, @Param('id') accountId: string, @Query() queryParams: FetchAccountUsersDto): Promise<FetchAccountUsersResponseDto> {
    return this.accountService.fetchAccountUsers(req.user.id, accountId, queryParams)
  }

  @Get(':id/entities')
  @RequirePermissions([], 'ACCOUNT_ADMINISTRATION')
  @UseGuards(PermissionsGuard)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Fetch account entities', description: 'Fetch entities linked to an account with pagination and filtering options.' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Paginated list of entities', type: FetchAccountEntitiesResponseDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 400, description: 'Failed to fetch account entities' })
  /** End -- Documentation */
  async fetchAccountEntities(@Req() req: AuthenticatedRequest, @Param('id') accountId: string, @Query() queryParams: FetchAccountEntitiesDto): Promise<FetchAccountEntitiesResponseDto> {
    return this.accountService.fetchAccountEntities(req.user.id, accountId, queryParams)
  }

  @Get(':id/roles')
  @RequirePermissions([], 'ACCOUNT_ADMINISTRATION')
  @UseGuards(PermissionsGuard)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Fetch account roles', description: 'Fetch roles linked to an account with pagination and filtering options.' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'Paginated list of roles', type: FetchAccountRolesResponseDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 400, description: 'Failed to fetch account roles' })
  /** End -- Documentation */
  async fetchAccountRoles(@Req() req: AuthenticatedRequest, @Param('id') accountId: string, @Query() queryParams: FetchAccountRolesDto): Promise<FetchAccountRolesResponseDto> {
    return this.accountService.fetchAccountRoles(req.user.id, accountId, queryParams)
  }

  @Patch(':id/status')
  @RequirePermissions(['ACCOUNT_UPDATE'], 'ACCOUNT_ADMINISTRATION')
  @UseGuards(PermissionsGuard)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Update account status', description: 'Activate or deactivate an account that the user has access to.' })
  @ApiParam({ name: 'id', description: 'Account ID', type: 'string' })
  @ApiResponse({ status: 200, description: 'Account status updated successfully', type: UpdateAccountStatusResponseDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 400, description: 'Failed to update account status' })
  @ApiUnauthorizedResponse({ description: 'User does not have permission to manage the account' })
  /** End -- Documentation */
  async updateAccountStatus(@Req() req: AuthenticatedRequest, @Param('id') accountId: string, @Body() updateAccountStatusDto: UpdateAccountStatusDto): Promise<UpdateAccountStatusResponseDto> {
    return this.accountService.updateAccountStatus(req.user.id, accountId, updateAccountStatusDto.isActive)
  }

  @Patch(':id/users')
  @RequirePermissions(['ACCOUNT_USER_MANAGEMENT'], 'ACCOUNT_ADMINISTRATION')
  @UseGuards(PermissionsGuard)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Update account users', description: 'Update the users linked to an account.' })
  @ApiParam({ name: 'id', description: 'Account ID' })
  @ApiResponse({ status: 200, description: 'The users have been successfully updated for the account', type: UpdateAccountUsersResponseDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
  @ApiResponse({ status: 400, description: 'Failed to update account users' })
  @ApiUnauthorizedResponse({ description: 'User does not have permission to manage the account' })
  /** End -- Documentation */
  async updateAccountUsers(@Req() req: AuthenticatedRequest, @Param('id') accountId: string, @Body() updateAccountUsersDto: UpdateAccountUsersDto): Promise<UpdateAccountUsersResponseDto> {
    return this.accountService.updateAccountUsers(req.user.id, accountId, updateAccountUsersDto.userIds)
  }
}
