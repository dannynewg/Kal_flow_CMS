import { describe, expect, it } from 'vitest';
import { hashInvitationToken, invitationExpiresAt } from './invitations.service';

describe('invitation security helpers', () => {
  it('stores a deterministic digest instead of the raw invitation token', () => {
    const token = 'a-private-invitation-token';
    const digest = hashInvitationToken(token);
    expect(digest).toHaveLength(64);
    expect(digest).not.toContain(token);
    expect(hashInvitationToken(token)).toBe(digest);
  });

  it('sets invitations to expire after seven days', () => {
    const now = new Date('2026-08-02T00:00:00.000Z');
    expect(invitationExpiresAt(now).toISOString()).toBe('2026-08-09T00:00:00.000Z');
  });
});
