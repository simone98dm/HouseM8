import { describe, it, expect } from 'vitest';
import { defineComponent, h, inject, type Ref } from 'vue';
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime';
import Wizard from '~/components/ui/Wizard.vue';

mockNuxtImport('useI18n', () => () => ({
  t: (key: string) => key,
  locale: { value: 'en' },
}));

type WizardCtx = {
  currentStep: Ref<number>;
  setStepValid: (index: number, valid: boolean) => void;
};

// Marks its step valid on mount so the "next" button becomes enabled — the
// wizard blocks advancing until the active step reports itself valid.
const ValidStep = defineComponent({
  setup() {
    const ctx = inject<WizardCtx>('wizardStep');
    ctx?.setStepValid(0, true);
    ctx?.setStepValid(1, true);
    return () => h('div', 'step body');
  },
});

const mountWizard = () =>
  mountSuspended(Wizard, {
    props: { steps: ['One', 'Two', 'Three'] },
    slots: { default: () => h(ValidStep) },
  });

const nextButton = (w: Awaited<ReturnType<typeof mountWizard>>) =>
  w
    .findAll('button')
    .filter((b) => !b.attributes('disabled'))
    .at(-1)!;

describe('Wizard step-change', () => {
  // Regression guard. goNext()/goBack() used to emit `step-change` explicitly
  // AND mutate currentStep, which also woke the watcher — so every transition
  // emitted twice with an identical value. The watcher is now the only emitter.
  // The pre-existing test for this asserted against a locally-constructed mock
  // rather than the component, so it could never have caught the duplicate.
  it('emits step-change exactly once per forward transition', async () => {
    const wrapper = await mountWizard();

    await nextButton(wrapper).trigger('click');

    expect(wrapper.emitted('step-change')).toHaveLength(1);
    expect(wrapper.emitted('step-change')![0]).toEqual([1]);
  });

  it('emits step-change exactly once per backward transition', async () => {
    const wrapper = await mountWizard();

    await nextButton(wrapper).trigger('click');
    const back = wrapper.findAll('button')[0]!;
    await back.trigger('click');

    expect(wrapper.emitted('step-change')).toHaveLength(2);
    expect(wrapper.emitted('step-change')![1]).toEqual([0]);
  });
});
