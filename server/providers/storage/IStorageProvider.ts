/**
 * Storage Provider Interface
 * Abstracts file storage operations for different providers (Supabase Storage, S3, local filesystem, etc.)
 */

export interface UploadOptions {
  contentType?: string;
  upsert?: boolean;
}

export interface StorageFile {
  path: string;
  publicUrl: string;
}

export interface IStorageProvider {
  /**
   * Upload a file to storage
   * @param bucket - Storage bucket name
   * @param path - File path within the bucket
   * @param data - File data as Buffer
   * @param options - Upload options
   * @returns Storage file information or error
   */
  upload(
    bucket: string,
    path: string,
    data: Buffer,
    options?: UploadOptions,
  ): Promise<{ data: StorageFile | null; error: string | null }>;

  /**
   * Delete a file from storage
   * @param bucket - Storage bucket name
   * @param path - File path within the bucket
   * @returns Success status or error
   */
  delete(bucket: string, path: string): Promise<{ error: string | null }>;

  /**
   * Get public URL for a file
   * @param bucket - Storage bucket name
   * @param path - File path within the bucket
   * @returns Public URL
   */
  getPublicUrl(bucket: string, path: string): string;

  /**
   * Delete multiple files from storage
   * @param bucket - Storage bucket name
   * @param paths - Array of file paths within the bucket
   * @returns Success status or error
   */
  deleteMany(
    bucket: string,
    paths: string[],
  ): Promise<{ error: string | null }>;
}
