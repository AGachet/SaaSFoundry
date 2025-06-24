/**
 * Resources
 */
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger'

/**
 * Dependencies
 */
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard'
import { AuthService } from '@modules/auth/services/auth.service'

/**
 * DTO
 */
import { RequestPasswordResetDto } from '@modules/auth/dto/requests/request-password-reset.dto'
import { ResetPasswordDto } from '@modules/auth/dto/requests/reset-password.dto'
import { SignInDto } from '@modules/auth/dto/requests/signin.dto'
import { SignOutDto } from '@modules/auth/dto/requests/signout.dto'
import { SignUpDto } from '@modules/auth/dto/requests/signup.dto'

import { GuestResponseDto } from '@modules/auth/dto/responses/guest.response.dto'
import { MeResponseDto } from '@modules/auth/dto/responses/me.response.dto'
import { RequestPasswordResetResponseDto } from '@modules/auth/dto/responses/request-password-reset.response.dto'
import { ResetPasswordResponseDto } from '@modules/auth/dto/responses/reset-password.response.dto'
import { SignInResponseDto } from '@modules/auth/dto/responses/signin.response.dto'
import { SignOutResponseDto } from '@modules/auth/dto/responses/signout.response.dto'
import { SignUpResponseDto } from '@modules/auth/dto/responses/signup.response.dto'

/**
 * Type
 */
import type { User } from '@prisma/client'
import type { Request, Response } from 'express'

// Extend Request type to include user property
interface AuthenticatedRequest extends Request {
  user: User
}

/**
 * Declaration
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @HttpCode(HttpStatus.OK)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'User signup', description: 'Create a new user account. A confirmation email will be sent if the email address is valid.' })
  @ApiOkResponse({ type: SignUpResponseDto, description: 'Registration request processed. If the email is valid, a confirmation email will be sent.' })
  @ApiBadRequestResponse({ description: 'Invalid or missing required fields.' })
  /** End -- Documentation */
  async signUp(@Body() signUpDto: SignUpDto): Promise<SignUpResponseDto> {
    return this.authService.signUp(signUpDto)
  }

  @Post('signin')
  @HttpCode(HttpStatus.OK)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'User signin', description: 'Authenticate user and return access token.' })
  @ApiOkResponse({ type: SignInResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  /** End -- Documentation */
  async signIn(@Body() signInDto: SignInDto, @Res({ passthrough: true }) response: Response): Promise<SignInResponseDto> {
    const { accessToken, refreshToken, userId } = await this.authService.signIn(signInDto)
    this.authService.setAuthCookies(response, accessToken, refreshToken)
    return { userId }
  }

  @Post('signout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'User signout', description: 'Invalidate user session and clear authentication tokens.' })
  @ApiOkResponse({ type: SignOutResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token.' })
  /** End -- Documentation */
  async signOut(@Res({ passthrough: true }) response: Response, @Body() signOutDto: SignOutDto): Promise<SignOutResponseDto> {
    const result = await this.authService.signOut(signOutDto)
    this.authService.clearAuthCookies(response)
    return result
  }

  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Request password reset', description: 'Request a password reset. If the email is valid, a reset email will be sent.' })
  @ApiOkResponse({ type: RequestPasswordResetResponseDto, description: 'Request processed. If the email is valid, reset instructions will be sent.' })
  @ApiBadRequestResponse({ description: 'Invalid or missing required fields.' })
  /** End -- Documentation */
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto): Promise<RequestPasswordResetResponseDto> {
    return this.authService.requestPasswordReset(requestPasswordResetDto)
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Reset password', description: 'Reset user password using the token received by email.' })
  @ApiOkResponse({ type: ResetPasswordResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid or expired token.' })
  /** End -- Documentation */
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<ResetPasswordResponseDto> {
    return this.authService.resetPassword(resetPasswordDto)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Get current user', description: 'Retrieve the profile of the currently authenticated user. Requires USER_ACCOUNT_MANAGEMENT module and USER_PROFILE_VIEW_OWN permission.' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized - Invalid or missing token.' })
  /** End -- Documentation */
  async getMe(@Req() request: AuthenticatedRequest): Promise<MeResponseDto> {
    return this.authService.getMe(request.user.id)
  }

  @Get('guest')
  @HttpCode(HttpStatus.OK)
  /** Start -- Documentation */
  @ApiOperation({ summary: 'Get guest user', description: 'Retrieve the basic information for guest users.' })
  @ApiOkResponse({ type: GuestResponseDto })
  /** End -- Documentation */
  async getGuest(): Promise<GuestResponseDto> {
    return this.authService.getGuest()
  }
}
