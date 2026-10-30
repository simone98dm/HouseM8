/**
 * Storage Provider Factory
 * Creates storage provider instances based on the configured database provider
 */

import type { IStorageProvider } from './IStorageProvider';

/**
 * Stub storage provider for when no storage is configured
 */
class StubStorageProvider implements IStorageProvider {
  async upload() {
    return {
      data: null,
      error:
        'Storage provider not configured. Please set up AWS S3 or local storage.',
    };
  }

  async delete() {
    return { error: 'Storage provider not configured.' };
  }

  getPublicUrl() {
    return '';
  }

  async deleteMany() {
    return { error: 'Storage provider not configured.' };
  }
}

/**
 * Fail fast when a real storage provider is enabled without the GDPR gate
 * being acknowledged. Set STORAGE_GDPR_GATE_ACK=true once all three hold.
 */
export function assertStorageGdprGate(): void {
  const provider = process.env.STORAGE_PROVIDER;
  if (!provider || provider === 'none') return;
  if (process.env.STORAGE_GDPR_GATE_ACK === 'true') return;
  throw new Error(
    `STORAGE_PROVIDER="${provider}" is blocked by the GDPR gate. Before enabling file storage: ` +
      '(1) strip EXIF/GPS metadata from uploads, ' +
      '(2) make objects private by default (signed URLs only), ' +
      '(3) include stored files in account/house erasure. ' +
      'Then set STORAGE_GDPR_GATE_ACK=true.',
  );
}

/**
 * Get storage provider instance for the current request
 * @returns Storage provider instance
 */
export function getStorageProvider(): IStorageProvider {
  assertStorageGdprGate();
  // For PostgreSQL or other providers, implement alternative storage
  // Options: Local filesystem, AWS S3, Cloudinary, etc.
  return new StubStorageProvider();
}
