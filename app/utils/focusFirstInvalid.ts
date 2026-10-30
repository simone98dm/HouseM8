/**
 * WCAG 3.3.1: after a failed submit, land on the first invalid field inside the
 * open dialog; its error is announced via aria-describedby + role=alert.
 */
export function focusFirstInvalid(): Promise<void> {
  return nextTick(() =>
    document
      .querySelector<HTMLElement>('[role="dialog"] [aria-invalid="true"]')
      ?.focus(),
  );
}
