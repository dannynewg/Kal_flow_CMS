import type { OrganizationRole } from '@kal-flow/database';

export const permissions = ['organization.read','organization.manage','membership.read','membership.manage'] as const;
export type Permission = (typeof permissions)[number];

const all = new Set<Permission>(permissions);
export const rolePermissions: Record<OrganizationRole, ReadonlySet<Permission>> = {
  OWNER: all,
  ADMIN: all,
  CONTRACT_MANAGER: new Set(['organization.read','membership.read']),
  LEGAL_OFFICER: new Set(['organization.read','membership.read']),
  DEPARTMENT_MANAGER: new Set(['organization.read','membership.read']),
  FINANCE_OFFICER: new Set(['organization.read']),
  PROCUREMENT_OFFICER: new Set(['organization.read']),
  CONTRACT_OWNER: new Set(['organization.read']),
  AUDITOR: new Set(['organization.read','membership.read']),
  VIEWER: new Set(['organization.read']),
};

export function roleHasPermissions(role: OrganizationRole, required: readonly Permission[]): boolean {
  return required.every((permission) => rolePermissions[role]?.has(permission) === true);
}
