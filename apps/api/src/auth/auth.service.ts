import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedPrincipal } from './principal';

@Injectable()
export class AuthService {
  private readonly realm = process.env.KEYCLOAK_REALM ?? 'kal-flow';
  private readonly issuer = `${process.env.KEYCLOAK_URL ?? 'http://localhost:8080'}/realms/${this.realm}`;
  private readonly audience = process.env.KEYCLOAK_API_AUDIENCE ?? 'kal-flow-api';
  private readonly jose = import('jose');
  private readonly jwks = this.jose.then(({ createRemoteJWKSet }) => createRemoteJWKSet(new URL(`${process.env.KEYCLOAK_INTERNAL_URL ?? 'http://localhost:8080'}/realms/${this.realm}/protocol/openid-connect/certs`)));

  constructor(private readonly prisma: PrismaService) {}

  async authenticate(accessToken: string): Promise<AuthenticatedPrincipal> {
    let payload;
    try {
      const [{ jwtVerify }, jwks] = await Promise.all([this.jose, this.jwks]);
      ({ payload } = await jwtVerify(accessToken, jwks, { issuer: this.issuer, audience: this.audience }));
    } catch {
      throw new UnauthorizedException('The access token is invalid or expired');
    }
    if (!payload.sub) throw new UnauthorizedException('The access token has no subject');
    const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : undefined;
    const displayName = typeof payload.name === 'string' ? payload.name : undefined;
    const user = await this.prisma.client.user.upsert({
      where: { identityProvider_subject: { identityProvider: this.issuer, subject: payload.sub } },
      create: { identityProvider: this.issuer, subject: payload.sub, email, displayName },
      update: { email, displayName },
    });
    return { userId:user.id, subject:payload.sub, issuer:this.issuer, ...(email ? {email} : {}), ...(displayName ? {displayName} : {}) };
  }
}
