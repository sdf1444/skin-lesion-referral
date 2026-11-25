import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import type { EnvVars } from '../config/env.validation';
import type { AuthUser } from '../users/roles';
import type { User } from '../users/user.entity';
import { BCRYPT_COST, UsersService } from '../users/users.service';

interface TokenPayload {
  sub: string;
  tv: number;
}

// Compared against when the email is unknown so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

export const toAuthUser = (u: User): AuthUser => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
});

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<EnvVars, true>,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ token: string; user: AuthUser }> {
    const user = await this.users.findByEmail(email);
    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok)
      throw new UnauthorizedException('Invalid email or password');
    const payload: TokenPayload = { sub: user.id, tv: user.tokenVersion };
    return { token: await this.jwt.signAsync(payload), user: toAuthUser(user) };
  }

  /** Verifies the token and reloads the user so role changes and sign-outs apply immediately. */
  async authenticateToken(token: string): Promise<AuthUser | null> {
    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token);
      const user = await this.users.findById(payload.sub);
      return user && user.tokenVersion === payload.tv ? toAuthUser(user) : null;
    } catch {
      return null;
    }
  }

  /** Invalidates all of the user's tokens, but only if the presented token is currently valid. */
  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    const user = await this.authenticateToken(token);
    if (user) await this.users.revokeTokens(user.id);
  }

  get cookieOptions() {
    return {
      httpOnly: true,
      sameSite: 'strict' as const,
      secure: this.config.getOrThrow<string>('COOKIE_SECURE') === 'true',
      path: '/',
    };
  }

  get ttlMs(): number {
    return this.config.getOrThrow<number>('JWT_TTL_SECONDS') * 1000;
  }
}
