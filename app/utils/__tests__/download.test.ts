import { describe, it, expect, vi, afterEach } from 'vitest';
import { saveBlob, EXPORT_RATE_LIMITED } from '~/utils/download';

describe('saveBlob', () => {
  afterEach(() => vi.restoreAllMocks());

  it('downloads the blob under the given filename and releases the URL', () => {
    URL.createObjectURL = vi.fn(() => 'blob:abc');
    URL.revokeObjectURL = vi.fn();
    let link: HTMLAnchorElement | null = null;
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      // eslint-disable-next-line @typescript-eslint/no-this-alias -- capture the clicked anchor
      link = this;
    });
    const blob = new Blob(['{}']);
    saveBlob(blob, 'export.json');
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(link!.href).toBe('blob:abc');
    expect(link!.download).toBe('export.json');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:abc');
  });

  it('exposes a stable rate-limit marker', () => {
    expect(EXPORT_RATE_LIMITED).toBe('RATE_LIMITED');
  });
});
