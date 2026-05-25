import { Body, Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthService } from './auth.service';

// Brute-force defence on the auth surface. The global throttler is 20/s
// short + 200/min medium, which is too generous for credential endpoints.
// These overrides override the global per-route.
//   strict — for endpoints that gate credentials or trigger user-side email:
//     5 attempts / 60s short, 20 / hour medium.
//   moderate — for token-consumption endpoints (less attractive to brute):
//     10 attempts / 60s short (no medium override; falls back to global).
const STRICT_AUTH    = { short: { limit: 5,  ttl: 60_000 },     medium: { limit: 20, ttl: 3_600_000 } };
const MODERATE_AUTH  = { short: { limit: 10, ttl: 60_000 } };
import {
  ChangePasswordDto,
  LoginDto,
  MagicLinkConsumeDto,
  MagicLinkRequestDto,
  RefreshDto,
  RegisterDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import type { JwtPayload } from '@madcreate/shared';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle(STRICT_AUTH)
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.auth.register(dto, { userAgent: req.header('user-agent'), ip: req.ip });
  }

  @Public()
  @Throttle(STRICT_AUTH)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, { userAgent: req.header('user-agent'), ip: req.ip });
  }

  @Public()
  @Throttle(MODERATE_AUTH)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.auth.refresh(dto.refreshToken, { userAgent: req.header('user-agent'), ip: req.ip });
  }

  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: JwtPayload) {
    await this.auth.logout(user.sub);
  }

  @Public()
  @Throttle(STRICT_AUTH)
  @Post('password/request-reset')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.auth.requestPasswordReset(dto.email);
    return { accepted: true };
  }

  @Public()
  @Throttle(MODERATE_AUTH)
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.auth.resetPassword(dto);
    return { reset: true };
  }

  @Public()
  @Throttle(MODERATE_AUTH)
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.auth.verifyEmail(dto.token);
    return { verified: true };
  }

  @ApiBearerAuth()
  @Throttle(STRICT_AUTH)
  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  async changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto) {
    await this.auth.changePassword(user.sub, dto);
    return { changed: true };
  }

  @Public()
  @Throttle(STRICT_AUTH)
  @Post('magic/request')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestMagicLink(@Body() dto: MagicLinkRequestDto) {
    await this.auth.requestMagicLink(dto);
    return { accepted: true };
  }

  @Public()
  @Throttle(MODERATE_AUTH)
  @Post('magic')
  @HttpCode(HttpStatus.OK)
  consumeMagicLink(@Body() dto: MagicLinkConsumeDto, @Req() req: Request) {
    return this.auth.consumeMagicLink(dto.token, { userAgent: req.header('user-agent'), ip: req.ip });
  }
}
