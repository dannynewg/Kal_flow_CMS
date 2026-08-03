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
  'document.read',
  'document.upload',
  'document.manage',
  'library.read',
  'library.manage',
  'operations.read',
  'operations.manage',
  'renewal.manage',
  'report.read',
  'notification.read',
  'notification.manage',
] as const;
export type Permission = (typeof permissions)[number];

const all = new Set<Permission>(permissions);
export const rolePermissions: Record<OrganizationRole, ReadonlySet<Permission>> = {
  OWNER: all,
  ADMIN: new Set(permissions.filter((permission) => permission !== 'organization.transfer')),
  CONTRACT_MANAGER: new Set(['organization.read','membership.read','department.read','contract.request.create','contract.request.read','contract.request.triage','contract.read','contract.manage','contract.review','contract.activate','document.read','document.upload','document.manage','library.read','library.manage','operations.read','operations.manage','renewal.manage','report.read','notification.read','notification.manage']),
  LEGAL_OFFICER: new Set(['organization.read','membership.read','department.read','contract.request.create','contract.request.read','contract.read','contract.review','document.read','document.upload','document.manage','library.read','library.manage','operations.read','renewal.manage','report.read']),
  DEPARTMENT_MANAGER: new Set(['organization.read','membership.read','department.read','department.manage','contract.request.create','contract.request.read','contract.read','contract.review','document.read','library.read','operations.read','operations.manage','report.read']),
  FINANCE_OFFICER: new Set(['organization.read','department.read','contract.request.create','contract.request.read','contract.read','contract.review','document.read','library.read','operations.read','operations.manage','report.read']),
  PROCUREMENT_OFFICER: new Set(['organization.read','department.read','contract.request.create','contract.request.read','contract.read','contract.review','document.read','library.read','operations.read']),
  CONTRACT_OWNER: new Set(['organization.read','department.read','contract.request.create','contract.request.read','contract.read','contract.manage','document.read','document.upload','document.manage','library.read','operations.read','operations.manage','renewal.manage']),
  AUDITOR: new Set(['organization.read','membership.read','department.read','invitation.read','audit.read','contract.request.read','contract.read','document.read','library.read','operations.read','report.read','notification.read']),
  VIEWER: new Set(['organization.read','department.read','contract.request.create','contract.request.read','contract.read','document.read','library.read','operations.read']),
};

export function roleHasPermissions(role: OrganizationRole, required: readonly Permission[]): boolean {
  return required.every((permission) => rolePermissions[role]?.has(permission) === true);
}
