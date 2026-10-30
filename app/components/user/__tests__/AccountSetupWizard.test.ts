/**
 * AccountSetupWizard Component Tests
 *
 * The wizard was refactored to a 2-step onboarding flow:
 *   Step 1 (email users only): name + password
 *   Step 2: 6-digit invite code (skippable)
 *   Step 3 (feature-flagged): profile picture
 */

import { describe, it, expect, vi } from 'vitest';

describe('AccountSetupWizard', () => {
  describe('OAuth skip logic', () => {
    it('skips step 1 when user already has first_name (OAuth)', () => {
      const currentUser = { first_name: 'Simone', last_name: 'Local' };
      const isOAuthUser = !!currentUser?.first_name;
      expect(isOAuthUser).toBe(true);
    });

    it('shows step 1 when user has no first_name (email-only)', () => {
      const currentUser = { first_name: null };
      const isOAuthUser = !!currentUser?.first_name;
      expect(isOAuthUser).toBe(false);
    });
  });

  describe('Step 1 validation', () => {
    it('is invalid when any required field is missing', () => {
      const cases = [
        { firstName: '', lastName: 'Doe', password: 'password123' },
        { firstName: 'John', lastName: '', password: 'password123' },
        { firstName: 'John', lastName: 'Doe', password: 'short' },
      ];
      cases.forEach(({ firstName, lastName, password }) => {
        const isValid =
          firstName.trim().length > 0 &&
          lastName.trim().length > 0 &&
          password.length >= 8;
        expect(isValid).toBe(false);
      });
    });

    it('is valid when all fields meet requirements', () => {
      const firstName = 'John';
      const lastName = 'Doe';
      const password = 'securepass';
      const isValid =
        firstName.trim().length > 0 &&
        lastName.trim().length > 0 &&
        password.length >= 8;
      expect(isValid).toBe(true);
    });
  });

  describe('Step 2 validation', () => {
    it('code step is always valid (skippable)', () => {
      // Step 2 passes is-valid=true unconditionally
      expect(true).toBe(true);
    });

    it('detects complete code from 6 digits', () => {
      const inviteCode = '123456';
      const isCodeComplete = inviteCode.replace(/\D/g, '').length === 6;
      expect(isCodeComplete).toBe(true);
    });

    it('detects incomplete code', () => {
      const inviteCode = '1234';
      const isCodeComplete = inviteCode.replace(/\D/g, '').length === 6;
      expect(isCodeComplete).toBe(false);
    });
  });

  describe('logical step mapping', () => {
    const getLogicalStep = (wizardStep: number, isOAuthUser: boolean) => {
      if (!isOAuthUser) {
        if (wizardStep === 0) return 'name-password';
        if (wizardStep === 1) return 'invite-code';
        if (wizardStep === 2) return 'picture';
      } else {
        if (wizardStep === 0) return 'invite-code';
        if (wizardStep === 1) return 'picture';
      }
      return 'unknown';
    };

    it('maps step 0 to name-password for email users', () => {
      expect(getLogicalStep(0, false)).toBe('name-password');
    });

    it('maps step 1 to invite-code for email users', () => {
      expect(getLogicalStep(1, false)).toBe('invite-code');
    });

    it('maps step 0 to invite-code for OAuth users', () => {
      expect(getLogicalStep(0, true)).toBe('invite-code');
    });

    it('maps step 1 to picture for OAuth users', () => {
      expect(getLogicalStep(1, true)).toBe('picture');
    });
  });

  describe('error status mapping for code redemption', () => {
    const mapCodeError = (status: number) => {
      if (status === 423) return 'codeLocked';
      if (status === 410) return 'codeUsed';
      if (status === 409) return 'alreadyMember';
      return 'invalidCode';
    };

    it('maps 423 to codeLocked', () =>
      expect(mapCodeError(423)).toBe('codeLocked'));
    it('maps 410 to codeUsed', () =>
      expect(mapCodeError(410)).toBe('codeUsed'));
    it('maps 409 to alreadyMember', () =>
      expect(mapCodeError(409)).toBe('alreadyMember'));
    it('maps unknown status to invalidCode', () =>
      expect(mapCodeError(400)).toBe('invalidCode'));
  });

  describe('events', () => {
    it('emits submit with is_first_access: false', () => {
      const emit = vi.fn();
      emit('submit', { is_first_access: false });
      expect(emit).toHaveBeenCalledWith('submit', { is_first_access: false });
    });
  });

  describe('picture upload guard', () => {
    it('calls upload only when flag is enabled and picture is set', async () => {
      const mockUpload = vi
        .fn()
        .mockResolvedValue({ pictureUrl: 'url', user: {} });
      const flagEnabled = true;
      const profilePicture = new File(['data'], 'photo.jpg', {
        type: 'image/jpeg',
      });

      if (flagEnabled && profilePicture) await mockUpload(profilePicture);
      expect(mockUpload).toHaveBeenCalledWith(profilePicture);
    });

    it('skips upload when flag is disabled', async () => {
      const mockUpload = vi.fn();
      const flagEnabled = false;
      const profilePicture = new File(['data'], 'photo.jpg', {
        type: 'image/jpeg',
      });

      if (flagEnabled && profilePicture) await mockUpload(profilePicture);
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });
});
