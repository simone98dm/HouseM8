type FlagValue = boolean | string | number;

export const useFeatureFlags = () => {
  const flags = useState<Record<string, FlagValue>>(
    'feature-flags',
    () => ({}),
  );

  const isEnabled = (key: string): boolean => !!flags.value[key];

  const getFlag = <T extends FlagValue>(key: string, defaultValue: T): T =>
    (key in flags.value ? flags.value[key] : defaultValue) as T;

  return { flags, isEnabled, getFlag };
};
