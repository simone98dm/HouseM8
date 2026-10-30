import { verifyAuthCompat } from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';
import { getStorageProvider } from '~~/server/providers/storage/factory';
import type { MultiPartData } from 'h3';

/**
 * POST /api/reports/:id/images
 * Upload images for a report
 */

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_FILES = 10;

function validateImageFiles(files: MultiPartData[]): void {
  if (files.length > MAX_FILES) {
    throw createError({
      statusCode: 400,
      message: `Maximum ${MAX_FILES} images allowed per report`,
    });
  }
  for (const file of files) {
    if (!file.data) {
      throw createError({ statusCode: 400, message: 'Invalid file data' });
    }
    if (!ALLOWED_TYPES.has(file.type || '')) {
      throw createError({
        statusCode: 400,
        message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
      });
    }
    if (file.data.length > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 400,
        message: 'File size too large. Maximum 5MB allowed per file.',
      });
    }
  }
}

async function uploadImageFile(
  storage: ReturnType<typeof getStorageProvider>,
  repos: ReturnType<typeof getRepositories>,
  reportId: string,
  file: MultiPartData,
) {
  if (!file.data) return null;

  const fileExt = file.type?.split('/')[1] || 'png';
  const fileName = `reports/${reportId}/${Date.now()}-${Math.random().toString(36).slice(2, 11)}.${fileExt}`;

  const { data: uploadResult, error: uploadError } = await storage.upload(
    'report-images',
    fileName,
    file.data,
    { contentType: file.type, upsert: false },
  );

  if (uploadError || !uploadResult) {
    throw createError({
      statusCode: 500,
      message: 'Failed to upload file to storage',
    });
  }

  const urlData = storage.getPublicUrl('report-images', fileName);
  const { data: image, error } = await repos.reports.addImage({
    report_id: reportId,
    filename: file.filename || fileName,
    url: urlData || fileName,
  });

  if (error || !image) {
    throw createError({
      statusCode: 500,
      message: 'Failed to save image record',
    });
  }

  return image;
}

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const reportId = getRouterParam(event, 'id');

  if (!reportId) {
    throw createError({ statusCode: 400, message: 'Report ID is required' });
  }

  const repos = getRepositories();
  const isCreator = await repos.reports.isCreator(reportId, user.id);

  if (!isCreator) {
    throw createError({
      statusCode: 403,
      message: 'Only report creator can upload images',
    });
  }

  const form = await readMultipartFormData(event);

  if (!form?.length) {
    throw createError({ statusCode: 400, message: 'No files uploaded' });
  }

  const files = form.filter((item) => item.name === 'images');

  if (!files.length) {
    throw createError({
      statusCode: 400,
      message: 'No image files found in form data',
    });
  }

  validateImageFiles(files);

  try {
    const storage = getStorageProvider();
    const results = await Promise.all(
      files.map((file) => uploadImageFile(storage, repos, reportId, file)),
    );

    return { data: results.filter(Boolean) };
  } catch (error) {
    if (error instanceof Error && 'statusCode' in error) {
      throw error;
    }
    throw createError({ statusCode: 500, message: 'Failed to upload images' });
  }
});
