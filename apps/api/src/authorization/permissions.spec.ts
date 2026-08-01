import { describe, expect, it } from 'vitest';
import { roleHasPermissions } from './permissions';
describe('role permissions', () => {
  it('allows owners to manage memberships', () => expect(roleHasPermissions('OWNER',['membership.manage'])).toBe(true));
  it('reserves ownership transfer for the owner', () => {
    expect(roleHasPermissions('OWNER', ['organization.transfer'])).toBe(true);
    expect(roleHasPermissions('ADMIN', ['organization.transfer'])).toBe(false);
  });
  it('allows department managers to manage departments without managing invitations', () => {
    expect(roleHasPermissions('DEPARTMENT_MANAGER', ['department.manage'])).toBe(true);
    expect(roleHasPermissions('DEPARTMENT_MANAGER', ['invitation.manage'])).toBe(false);
  });
  it('allows auditors to read audit history without changing the organization', () => {
    expect(roleHasPermissions('AUDITOR', ['audit.read'])).toBe(true);
    expect(roleHasPermissions('AUDITOR', ['organization.manage'])).toBe(false);
  });
  it('keeps viewers read-only', () => {
    expect(roleHasPermissions('VIEWER',['organization.read'])).toBe(true);
    expect(roleHasPermissions('VIEWER',['membership.manage'])).toBe(false);
  });
});
