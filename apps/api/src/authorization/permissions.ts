import type { OrganizationRole } from '@kal-flow/database';

export const permissions = [
  'organization.read',
  'organization.manage',
  'organization.transfer',
  'membership.read',
  'membership.manage',
  'department.read',
  'department.manage',
  'invitation.read',
  'invitation.manage',
  'audit.read',
] as const;
export type Permission = (typeof permissions)[number];

const all = new Set<Permission>(permissions);
export const rolePermissions: Record<OrganizationRole, ReadonlySet<Permission>> = {
  OWNER: all,
  ADMIN: new Set(permissions.filter((permission) => permission !== 'organization.transfer')),
  CONTRACT_MANAGER: new Set(['organization.read','membership.read','department.read']),
  LEGAL_OFFICER: new Set(['organization.read','membership.read','department.read']),
  DEPARTMENT_MANAGER: new Set(['organization.read','membership.read','department.read','department.manage']),
  FINANCE_OFFICER: new Set(['organization.read','department.read']),
  PROCUREMENT_OFFICER: new Set(['organization.read','department.read']),
  CONTRACT_OWNER: new Set(['organization.read','department.read']),
  AUDITOR: new Set(['organization.read','membership.read','department.read','invitation.read','audit.read']),
  VIEWER: new Set(['organization.read','department.read']),
};

export function roleHasPermissions(role: OrganizationRole, required: readonly Permission[]): boolean {
  return required.every((permission) => rolePermissions[role]?.has(permission) === true);
}
