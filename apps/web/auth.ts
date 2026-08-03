import NextAuth, { type DefaultSession } from 'next-auth';
import Keycloak from 'next-auth/providers/keycloak';

declare module 'next-auth' {
  interface Session {
    error?: 'RefreshAccessTokenError';
    user: DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
    refreshToken?: string;
    error?: 'RefreshAccessTokenError';
  }
}

const realm = process.env.KEYCLOAK_REALM ?? 'kal-flow';
const externalIssuer = `${process.env.KEYCLOAK_URL ?? 'http://localhost:8080'}/realms/${realm}`;
const internalIssuer = `${process.env.KEYCLOAK_INTERNAL_URL ?? 'http://localhost:8080'}/realms/${realm}`;

async function refreshAccessToken(token: { refreshToken?: string }) {
  if (!token.refreshToken) return { ...token, error: 'RefreshAccessTokenError' as const };
  const response = await fetch(`${internalIssuer}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.KEYCLOAK_WEB_CLIENT_ID ?? 'kal-flow-web',
      client_secret: process.env.KEYCLOAK_WEB_CLIENT_SECRET ?? '',
      refresh_token: token.refreshToken,
    }),
    cache: 'no-store',
  });
  if (!response.ok) return { ...token, error: 'RefreshAccessTokenError' as const };
  const refreshed = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };
  return {
    ...token,
    accessToken: refreshed.access_token,
    accessTokenExpires: Date.now() + refreshed.expires_in * 1000,
    refreshToken: refreshed.refresh_token ?? token.refreshToken,
    error: undefined,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Keycloak({
      clientId: process.env.KEYCLOAK_WEB_CLIENT_ID ?? 'kal-flow-web',
      clientSecret: process.env.KEYCLOAK_WEB_CLIENT_SECRET ?? '',
      issuer: externalIssuer,
      authorization: `${externalIssuer}/protocol/openid-connect/auth`,
      token: `${internalIssuer}/protocol/openid-connect/token`,
      userinfo: `${internalIssuer}/protocol/openid-connect/userinfo`,
      jwks_endpoint: `${internalIssuer}/protocol/openid-connect/certs`,
      checks: ['pkce', 'state'],
    }),
  ],
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  callbacks: {
    redirect({ url, baseUrl }) {
      const target = new URL(url, baseUrl);
      const logout = new URL(`${externalIssuer}/protocol/openid-connect/logout`);
      if (target.origin === logout.origin && target.pathname === logout.pathname) return target.toString();
      return target.origin === new URL(baseUrl).origin ? target.toString() : baseUrl;
    },
    async jwt({ token, account }) {
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          accessTokenExpires: (account.expires_at ?? 0) * 1000,
          refreshToken: account.refresh_token,
        };
      }
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 30_000) return token;
      return refreshAccessToken(token);
    },
    session({ session, token }) {
      session.error = token.error;
      return session;
    },
  },
});
