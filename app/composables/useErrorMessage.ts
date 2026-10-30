/**
 * Extracts a human-readable error message from any thrown value.
 * Replaces unsafe `error as { ... }` casts scattered across composables.
 */

function extractFromData(data: Record<string, unknown>): string | null {
  if (typeof data.message === 'string') return data.message;
  if (typeof data.statusMessage === 'string') return data.statusMessage;
  return null;
}

export function extractErrorMessage(
  error: unknown,
  fallback = 'An error occurred',
): string {
  if (error instanceof Error) return error.message;
  if (typeof error !== 'object' || error === null) return fallback;

  const e = error as Record<string, unknown>;

  if (typeof e.data === 'object' && e.data !== null) {
    const msg = extractFromData(e.data as Record<string, unknown>);
    if (msg) return msg;
  }

  if (typeof e.message === 'string') return e.message;
  if (typeof e.statusMessage === 'string') return e.statusMessage;
  return fallback;
}
