import { z } from 'zod';

export const serverEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  KEYCLOAK_URL: z.url(),
  KEYCLOAK_INTERNAL_URL: z.url(),
  KEYCLOAK_REALM: z.string().min(1),
  KEYCLOAK_API_AUDIENCE: z.string().min(1),
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;
