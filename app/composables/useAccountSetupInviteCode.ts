import { consola } from 'consola';

/**
 * Owns the onboarding wizard's "invite code" step (Step 2, optional — the
 * user can finish the wizard without redeeming a code): the OTP field, its
 * completeness check, and the redemption call with its status-code-specific
 * error mapping. Extracted from AccountSetupWizard.vue for the same reason
 * as the name+password step.
 */
export function useAccountSetupInviteCode() {
  const { t } = useI18n();
  const userApi = useUserApi();

  const inviteCode = ref('');
  const codeError = ref('');
  const codeLoading = ref(false);
  // Set once the code is redeemed. The OTP field redeems on its last digit and
  // the wizard's finish redeems again; a code is single use, so the second
  // call must not reach the server (it would fail as "already a member").
  const joinedHouseId = ref<string | null>(null);

  const isCodeComplete = computed(
    () => inviteCode.value.replace(/\D/g, '').length === 6,
  );

  const handleRedeemCode = async (): Promise<boolean> => {
    if (joinedHouseId.value) return true;
    codeError.value = '';
    codeLoading.value = true;
    try {
      const result = await userApi.redeemInviteCode(inviteCode.value);
      if (!result) {
        codeError.value = t('onboarding.invite.errors.generic');
        return false;
      }
      joinedHouseId.value = result.data.house_id;
      return true;
    } catch (err: unknown) {
      consola.error('[AccountSetupWizard] Code redeem failed', err);
      const status =
        err && typeof err === 'object' && 'status' in err
          ? (err as { status: number }).status
          : 0;
      if (status === 423)
        codeError.value = t('onboarding.invite.errors.codeLocked');
      else if (status === 410)
        codeError.value = t('onboarding.invite.errors.codeUsed');
      else if (status === 409)
        codeError.value = t('onboarding.invite.errors.alreadyMember');
      else codeError.value = t('onboarding.invite.errors.invalidCode');
      return false;
    } finally {
      codeLoading.value = false;
    }
  };

  return {
    inviteCode,
    codeError,
    codeLoading,
    isCodeComplete,
    joinedHouseId,
    handleRedeemCode,
  };
}
