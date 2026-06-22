import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from './authenticated-user.interface';

interface KeycloakJwtPayload {
  sub: string;
  email?: string;
  realm_access?: {
    roles?: string[];
  };
}

function normalizePublicKey(rawKey: string): string {
  const key = rawKey.replace(/\\n/g, '\n').trim();

  if (key.length === 0) {
    return key;
  }

  if (key.includes('BEGIN PUBLIC KEY')) {
    return key;
  }

  return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['RS256'],
      secretOrKey: normalizePublicKey(
        configService.get<string>('REPORT_JWT_PUBLIC_KEY', '')
      )
    });
  }

  validate(payload: KeycloakJwtPayload): AuthenticatedUser {
    return {
      sub: payload.sub,
      email: payload.email,
      roles: Array.isArray(payload.realm_access?.roles)
        ? payload.realm_access.roles
        : []
    };
  }
}
