import { describe, expect, it } from 'vitest';
import { roleHasPermissions } from './permissions';
describe('role permissions', () => {
  it('allows owners to manage memberships', () => expect(roleHasPermissions('OWNER',['membership.manage'])).toBe(true));
  it('keeps viewers read-only', () => {
    expect(roleHasPermissions('VIEWER',['organization.read'])).toBe(true);
    expect(roleHasPermissions('VIEWER',['membership.manage'])).toBe(false);
  });
});
