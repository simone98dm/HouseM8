import { ref, watch, type Ref } from 'vue';

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useCountUp(
  target: Ref<number>,
  duration = 800,
): { displayValue: Ref<number> } {
  const displayValue = ref(target.value);

  if (!import.meta.client) {
    return { displayValue };
  }

  let raf = 0;
  let startTime: number | null = null;
  let startValue = 0;

  const animate = (ts: number) => {
    if (startTime === null) startTime = ts;
    const elapsed = ts - startTime;
    const progress = Math.min(elapsed / duration, 1);
    displayValue.value = Math.round(
      startValue + (target.value - startValue) * easeOutExpo(progress),
    );
    if (progress < 1) {
      raf = requestAnimationFrame(animate);
    }
  };

  const start = () => {
    cancelAnimationFrame(raf);
    startTime = null;
    startValue = displayValue.value;
    raf = requestAnimationFrame(animate);
  };

  watch(target, start, { immediate: true });

  return { displayValue };
}
