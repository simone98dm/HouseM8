import { consola } from 'consola';

/**
 * Owns the onboarding wizard's name step (Step 1, shown to email-registered
 * users only — OAuth users already have a first_name). The password is set
 * earlier, on the sign-up confirmation link.
 * Extracted from AccountSetupWizard.vue so the step's own fields,
 * validation, and submit call aren't interleaved with the wizard's
 * step-orchestration script.
 */
export function useAccountSetupNameStep() {
  const { t } = useI18n();
  const userApi = useUserApi();

  const firstName = ref('');
  const lastName = ref('');
  const step1Error = ref('');
  const step1Loading = ref(false);

  const isStep1Valid = computed(
    () => firstName.value.trim().length > 0 && lastName.value.trim().length > 0,
  );

  const handleStep1 = async (): Promise<boolean> => {
    step1Error.value = '';
    step1Loading.value = true;
    try {
      const result = await userApi.completeSetup({
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
      });
      if (!result) {
        step1Error.value = t('onboarding.wizard.step1.errors.generic');
        return false;
      }
      return true;
    } catch (err) {
      consola.error('[AccountSetupWizard] Step 1 failed', err);
      step1Error.value = t('onboarding.wizard.step1.errors.generic');
      return false;
    } finally {
      step1Loading.value = false;
    }
  };

  return {
    firstName,
    lastName,
    step1Error,
    step1Loading,
    isStep1Valid,
    handleStep1,
  };
}
