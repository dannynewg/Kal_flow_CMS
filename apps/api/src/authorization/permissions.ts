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
  'contract.request.create',
  'contract.request.read',
  'contract.request.triage',
  'contract.read',
  'contract.manage',
  'contract.review',
  'contract.activate',
] as const;
export type Permission = (typeof permissions)[number];

const all = new Set<Permission>(permissions);
export const rolePermissions: Record<OrganizationRole, ReadonlySet<Permission>> = {
  OWNER: all,
  ADMIN: new Set(permissions.filter((permission) => permission !== 'organization.transfer')),
  CONTRACT_MANAGER: new Set(['organization.read','membership.read','department.read','contract.request.create','contract.request.read','contract.request.triage','contract.read','contract.manage','contract.review','contract.activate']),
  LEGAL_OFFICER: new Set(['organization.read','membership.read','department.read','contract.request.create','contract.request.read','contract.read','contract.review']),
  DEPARTMENT_MANAGER: new Set(['organization.read','membership.read','department.read','department.manage','contract.request.create','contract.request.read','contract.read','contract.review']),
  FINANCE_OFFICER: new Set(['organization.read','department.read','contract.request.create','contract.request.read','contract.read','contract.review']),
  PROCUREMENT_OFFICER: new Set(['organization.read','department.read','contract.request.create','contract.request.read','contract.read','contract.review']),
  CONTRACT_OWNER: new Set(['organization.read','department.read','contract.request.create','contract.request.read','contract.read','contract.manage']),
  AUDITOR: new Set(['organization.read','membership.read','department.read','invitation.read','audit.read','contract.request.read','contract.read']),
  VIEWER: new Set(['organization.read','department.read','contract.request.create','contract.request.read','contract.read']),
};

export function roleHasPermissions(role: OrganizationRole, required: readonly Permission[]): boolean {
  return required.every((permission) => rolePermissions[role]?.has(permission) === true);
}
