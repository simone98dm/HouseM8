/** `error` value of useUser().exportData when the server rate-limited it. */
export const EXPORT_RATE_LIMITED = 'RATE_LIMITED';

/** Triggers a browser download for an in-memory file. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
