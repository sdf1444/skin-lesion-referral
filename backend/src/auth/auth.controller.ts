import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { AuthUser } from '../users/roles';
import { CurrentUser, Public, type AuthedRequest } from './auth.decorators';
import { AuthService } from './auth.service';
import { ACCESS_COOKIE } from './jwt-auth.guard';
import { LoginDto } from './login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthUser> {
    const { token, user } = await this.auth.login(dto.email, dto.password);
    res.cookie(ACCESS_COOKIE, token, {
      ...this.auth.cookieOptions,
      maxAge: this.auth.ttlMs,
    });
    return user;
  }

  // Public so an expired session can still sign out cleanly.
  @Public()
  @HttpCode(204)
  @Post('logout')
  async logout(
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.auth.logout(
      (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE],
    );
    res.clearCookie(ACCESS_COOKIE, this.auth.cookieOptions);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
