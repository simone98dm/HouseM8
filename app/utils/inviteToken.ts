const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Pulls the invite token out of a pasted invite URL or a bare token. */
export function extractInviteToken(input: string): string | null {
  return input.match(UUID_PATTERN)?.[0].toLowerCase() ?? null;
}
