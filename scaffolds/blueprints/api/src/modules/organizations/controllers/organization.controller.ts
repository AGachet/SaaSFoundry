/**
 * Resources
 */
import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiConsumes, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'

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
import type { AuthenticatedRequest } from '@common/types/authenticated-request.type'

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

  // TODO storage-service-active: @Post(':id/logo')
  // TODO storage-service-active: @RequirePermissions(['ORGANIZATION_UPDATE'], 'ORGANIZATION_ADMINISTRATION')
  // TODO storage-service-active: @UseGuards(PermissionsGuard)
  // TODO storage-service-active: @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (_req, file, cb) => { const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']; if (allowedMimes.includes(file.mimetype)) { cb(null, true) } else { cb(new BadRequestException('Only image files are allowed (jpeg, png, webp, svg)'), false) } } }))
  // TODO storage-service-active: @ApiOperation({ summary: 'Upload organization logo', description: 'Upload a logo image for the organization.' })
  // TODO storage-service-active: @ApiConsumes('multipart/form-data')
  // TODO storage-service-active: @ApiParam({ name: 'id', description: 'Organization ID' })
  // TODO storage-service-active: @ApiResponse({ status: 200, description: 'Logo uploaded successfully', type: FetchOrganizationResponseDto })
  // TODO storage-service-active: @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  // TODO storage-service-active: async uploadLogo(@Req() req: AuthenticatedRequest, @Param('id') id: string, @UploadedFile() file: Express.Multer.File): Promise<FetchOrganizationResponseDto> {
  // TODO storage-service-active:   if (!file) throw new BadRequestException('No file uploaded')
  // TODO storage-service-active:   return this.organizationService.uploadLogo(req.user.id, id, file)
  // TODO storage-service-active: }
}
