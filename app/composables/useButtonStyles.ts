import type { InjectionKey } from 'vue';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * A container that owns its buttons' size (the page header) provides it under
 * this key; UiButton/UiLinkButton then ignore their own `size` prop. This keeps
 * the navbar identical on every page, whatever size a page asks for.
 */
export const BUTTON_SIZE_KEY: InjectionKey<ButtonSize> = Symbol('button-size');

interface ButtonStyleOptions {
  variant: ButtonVariant;
  size: ButtonSize;
  outline: boolean;
  fullWidth: boolean;
}

/**
 * The single source of button appearance, shared by `UiButton` (a <button>) and
 * `UiLinkButton` (a <NuxtLink>).
 *
 * They used to carry two independent copies of this logic and had drifted
 * apart: LinkButton was rounded-xl against Button's rounded-full, a flat
 * primary against Button's gradient, border-2 outlines against border, and
 * gray-100 secondaries against the surface tokens. Two controls that read as
 * the same button rendered differently depending on whether the destination
 * happened to be a route.
 *
 * Disabled styling is deliberately NOT here: <button> uses the `disabled:`
 * variant, while <a> has no :disabled pseudo-class and must apply it manually.
 */
export const useButtonStyles = () => {
  const buttonClasses = ({
    variant,
    size,
    outline,
    fullWidth,
  }: ButtonStyleOptions): string => {
    const baseClasses =
      'inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed';

    const variantClasses: Record<ButtonVariant, string> = {
      primary: outline
        ? 'border border-brand text-brand hover:bg-brand-subtle'
        : 'bg-brand text-brand-on hover:bg-brand-hover',
      secondary: outline
        ? 'border border-line-control text-fg hover:bg-surface-hover'
        : 'bg-surface text-fg border border-line-control hover:bg-surface-hover',
      ghost: 'text-brand hover:bg-brand-subtle',
      danger: outline
        ? 'border border-danger text-danger-fg hover:bg-danger-subtle'
        : 'bg-danger text-on-status hover:opacity-90',
    };

    const sizeClasses: Record<ButtonSize, string> = {
      // DESIGN.md §5: every tap target is >=44px on phones, icon-only too.
      sm: 'min-h-9 min-w-9 px-3 text-sm max-sm:min-h-11 max-sm:min-w-11',
      md: 'min-h-11 sm:min-h-10 px-4 text-sm',
      lg: 'min-h-12 px-5 text-base',
    };

    return [
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      fullWidth ? 'w-full' : '',
    ]
      .filter(Boolean)
      .join(' ');
  };

  const iconSizeClasses = (size: ButtonSize): string =>
    ({ sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' })[size];

  return { buttonClasses, iconSizeClasses };
};
