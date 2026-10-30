export type FieldSize = 'sm' | 'md' | 'lg';

interface FieldStyleOptions {
  size?: FieldSize;
  error?: boolean;
  disabled?: boolean;
}

const BASE =
  'w-full rounded-control border bg-surface text-fg text-base sm:text-sm placeholder:text-fg-muted transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand';

// Heights match UiButton (min-h-11 on phones). `text-base` on phones stops iOS zoom-on-focus.
const SIZES: Record<FieldSize, string> = {
  sm: 'min-h-11 sm:min-h-9 px-3 py-1.5',
  md: 'min-h-11 sm:min-h-10 px-3 py-2',
  lg: 'min-h-12 px-4 py-3',
};

/**
 * The single source of text-field appearance, shared by `UiInput`, `UiSelect`
 * and `UiLanguageSwitcher` (they used to carry drifting copies).
 */
export const useFieldStyles = () => {
  const fieldClasses = ({
    size = 'md',
    error = false,
    disabled = false,
  }: FieldStyleOptions = {}): string =>
    [
      BASE,
      SIZES[size],
      error ? 'border-danger' : 'border-line-control',
      disabled ? 'bg-surface-hover text-fg-muted cursor-not-allowed' : '',
    ]
      .filter(Boolean)
      .join(' ');

  return { fieldClasses };
};

/**
 * `aria-describedby` for a field: the hint id merged with any caller-supplied
 * reference (auth pages point fields at their error banner).
 */
export const mergeDescribedBy = (
  hintId: string | undefined,
  external: unknown,
): string | undefined =>
  [hintId, typeof external === 'string' ? external : undefined]
    .filter(Boolean)
    .join(' ') || undefined;
