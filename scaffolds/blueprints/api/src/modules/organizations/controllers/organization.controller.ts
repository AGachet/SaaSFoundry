/**
 * Resources
 */
import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'

/**
 * Dependencies
 */
import { RequirePermissions } from '@common/decorators/require-permissions.decorator'
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard'
import { PermissionsGuard } from '@modules/auth/guards/permissions.guard'
import { OrganizationService } from '@modules/organizations/services/organization.service'

/**
 * DTO
 */
import { CreateOrganizationDto } from '@modules/organizations/dto/requests/create-organization.dto'
import { UpdateOrganizationDto } from '@modules/organizations/dto/requests/update-organization.dto'

import { FetchOrganizationResponseDto } from '@modules/organizations/dto/responses/fetch_organization.response.dto'

/**
 * Type
 */
import type { User } from '@prisma/client'
import type { Request } from 'express'

// Extend Request type to include user property
interface AuthenticatedRequest extends Request {
  user: User
}

/**
 * Declaration
 */
@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Get(':id')
  @RequirePermissions([], 'ORGANIZATION_ADMINISTRATION')
  @UseGuards(PermissionsGuard)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Fetch organization details', description: 'Fetch detailed account information.' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'The organization details',
    type: FetchOrganizationResponseDto
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 400, description: 'Failed to get organization details' })
  /** End -- Documentation */
  async fetchOrganization(@Req() req: AuthenticatedRequest, @Param('id') id: string): Promise<FetchOrganizationResponseDto> {
    return this.organizationService.fetchOrganization(req.user.id, id)
  }

  @Post()
  @RequirePermissions(['ORGANIZATION_CREATION'], 'ORGANIZATION_ADMINISTRATION')
  @UseGuards(PermissionsGuard)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Create organization', description: 'Create a new organization for an account.' })
  @ApiResponse({
    status: 201,
    description: 'The organization has been successfully created',
    type: FetchOrganizationResponseDto
  })
  @ApiResponse({ status: 400, description: 'Failed to create organization' })
  @ApiResponse({ status: 401, description: 'User does not have permission to create organizations' })
  /** End -- Documentation */
  async createOrganization(@Req() req: AuthenticatedRequest, @Body() createOrganizationDto: CreateOrganizationDto): Promise<FetchOrganizationResponseDto> {
    return this.organizationService.createOrganization(req.user.id, createOrganizationDto)
  }

  @Patch(':id')
  @RequirePermissions(['ORGANIZATION_UPDATE'], 'ORGANIZATION_ADMINISTRATION')
  @UseGuards(PermissionsGuard)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Update organization', description: 'Update the organization details.' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  @ApiResponse({
    status: 200,
    description: 'The organization has been successfully updated',
    type: FetchOrganizationResponseDto
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  @ApiResponse({ status: 400, description: 'Failed to update organization' })
  @ApiResponse({ status: 401, description: 'User does not have permission to update organizations' })
  /** End -- Documentation */
  async updateOrganization(@Req() req: AuthenticatedRequest, @Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto): Promise<FetchOrganizationResponseDto> {
    return this.organizationService.updateOrganization(req.user.id, id, updateOrganizationDto)
  }
}
