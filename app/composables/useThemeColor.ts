// Browser chrome colour follows the active theme (--surface in tokens.css).
const THEME_COLOR = { light: '#ffffff', dark: '#131629' } as const;

export const useThemeColor = () => {
  const colorMode = useColorMode();
  useHead({
    meta: [
      {
        name: 'theme-color',
        content: computed(() =>
          colorMode.value === 'dark' ? THEME_COLOR.dark : THEME_COLOR.light,
        ),
      },
    ],
  });
};
