export interface AuthenticatedPrincipal {
  userId: string;
  subject: string;
  issuer: string;
  email?: string;
  displayName?: string;
}
