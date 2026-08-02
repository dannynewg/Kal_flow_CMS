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
  it('lets ordinary members request contracts without managing them', () => {
    expect(roleHasPermissions('VIEWER',['organization.read'])).toBe(true);
    expect(roleHasPermissions('VIEWER',['contract.request.create'])).toBe(true);
    expect(roleHasPermissions('VIEWER',['contract.manage'])).toBe(false);
    expect(roleHasPermissions('VIEWER',['membership.manage'])).toBe(false);
  });
  it('separates triage, review, and activation authority', () => {
    expect(roleHasPermissions('CONTRACT_MANAGER', ['contract.request.triage','contract.activate'])).toBe(true);
    expect(roleHasPermissions('LEGAL_OFFICER', ['contract.review'])).toBe(true);
    expect(roleHasPermissions('LEGAL_OFFICER', ['contract.activate'])).toBe(false);
  });
});
