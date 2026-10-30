/**
 * default.vue Layout — Onboarding Gate Tests
 *
 * The onboarding wizard (with its invite-code step) must never render while
 * house membership data is still loading, and never render at all once the
 * user actually has a house — regardless of a possibly-stale
 * is_first_access flag. This mirrors the three-state gate computed in
 * app/layouts/default.vue.
 */
import { describe, it, expect } from 'vitest';

function computeGate({
  isFirstAccess,
  isHouseDataLoading,
  hasHouse,
}: {
  isFirstAccess: boolean;
  isHouseDataLoading: boolean;
  hasHouse: boolean;
}) {
  const showOnboardingLoading = isFirstAccess && isHouseDataLoading;
  const showAccountSetupWizard =
    isFirstAccess && !isHouseDataLoading && !hasHouse;
  const showAccountSetupModal = showOnboardingLoading || showAccountSetupWizard;
  return {
    showOnboardingLoading,
    showAccountSetupWizard,
    showAccountSetupModal,
  };
}

describe('default.vue onboarding gate', () => {
  it('shows a loading state, never the join screen, while membership data loads', () => {
    const gate = computeGate({
      isFirstAccess: true,
      isHouseDataLoading: true,
      hasHouse: false,
    });

    expect(gate.showOnboardingLoading).toBe(true);
    expect(gate.showAccountSetupWizard).toBe(false);
    expect(gate.showAccountSetupModal).toBe(true);
  });

  it('never shows onboarding once the user has a house, even if is_first_access is stale', () => {
    const gate = computeGate({
      isFirstAccess: true,
      isHouseDataLoading: false,
      hasHouse: true,
    });

    expect(gate.showOnboardingLoading).toBe(false);
    expect(gate.showAccountSetupWizard).toBe(false);
    expect(gate.showAccountSetupModal).toBe(false);
  });

  it('never shows onboarding while still loading even if a stale house is present', () => {
    const gate = computeGate({
      isFirstAccess: true,
      isHouseDataLoading: true,
      hasHouse: true,
    });

    expect(gate.showAccountSetupWizard).toBe(false);
    expect(gate.showOnboardingLoading).toBe(true);
  });

  it('shows the wizard only when genuinely first-access, house-less, and not loading', () => {
    const gate = computeGate({
      isFirstAccess: true,
      isHouseDataLoading: false,
      hasHouse: false,
    });

    expect(gate.showAccountSetupWizard).toBe(true);
    expect(gate.showOnboardingLoading).toBe(false);
    expect(gate.showAccountSetupModal).toBe(true);
  });

  it('never shows onboarding for a returning user (is_first_access false)', () => {
    const gate = computeGate({
      isFirstAccess: false,
      isHouseDataLoading: true,
      hasHouse: false,
    });

    expect(gate.showAccountSetupModal).toBe(false);
  });
});
