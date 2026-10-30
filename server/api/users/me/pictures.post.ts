import { verifyAuth } from '~~/server/utils/auth';
import { getRepositories } from '~~/server/repositories/factory';
import { assertProfileSharingConsent } from '~~/server/utils/profile-consent';
import { getStorageProvider } from '~~/server/providers/storage/factory';

/**
 * POST /api/users/me/pictures
 * Upload a new profile picture
 *
 * Uses storage provider abstraction for file uploads.
 * Currently supports Supabase Storage. For other providers,
 * implement IStorageProvider (e.g., S3StorageProvider, LocalStorageProvider).
 */
export default defineEventHandler(async (event) => {
  const user = await verifyAuth(event);
  await assertProfileSharingConsent(user.id);
  const repos = getRepositories();

  // Get the uploaded file from the form data
  const form = await readMultipartFormData(event);

  if (!form?.length) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded',
    });
  }

  const file = form.find((item) => item.name === 'picture');

  if (!file?.data) {
    throw createError({
      statusCode: 400,
      message: 'Picture file not found in form data',
    });
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type || '')) {
    throw createError({
      statusCode: 400,
      message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
    });
  }

  // Validate file size (5MB limit)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.data.length > maxSize) {
    throw createError({
      statusCode: 400,
      message: 'File size too large. Maximum 5MB allowed.',
    });
  }

  // Get current user profile pictures using repository
  const { data: currentUser, error: userError } = await repos.users.getById(
    user.id,
  );

  if (userError || !currentUser) {
    throw createError({
      statusCode: 500,
      message: 'Failed to fetch current user data',
    });
  }

  const currentPictures = currentUser.profile_pictures || [];

  // Check if user already has max pictures (6)
  if (currentPictures.length >= 6) {
    throw createError({
      statusCode: 400,
      message: 'Maximum 6 pictures allowed',
    });
  }

  try {
    const storage = getStorageProvider();

    // Generate unique filename
    const fileExt = file.type?.split('/')[1] || 'png';
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    // Upload to storage
    const { data: uploadResult, error: uploadError } = await storage.upload(
      'profile-pictures',
      fileName,
      file.data,
      {
        contentType: file.type,
        upsert: false,
      },
    );

    if (uploadError || !uploadResult) {
      throw createError({
        statusCode: 500,
        message: 'Failed to upload file to storage',
      });
    }

    const pictureUrl = uploadResult.publicUrl;

    // Update user profile with new picture URL using repository
    const updatedPictures = [...currentPictures, pictureUrl];

    const { data, error: updateError } = await repos.users.update(user.id, {
      profile_pictures: updatedPictures,
    });

    if (updateError) {
      // If database update fails, try to delete the uploaded file
      await storage.delete('profile-pictures', fileName);

      throw createError({
        statusCode: 500,
        message: 'Failed to update user profile',
      });
    }

    return {
      data: {
        pictureUrl,
        user: data,
      },
    };
  } catch (error: unknown) {
    const errorObj = error as { statusCode?: number; message?: string };
    // Only errors raised here (they carry a statusCode) keep their message.
    throw createError({
      statusCode: errorObj.statusCode || 500,
      message:
        (errorObj.statusCode && errorObj.message) || 'Failed to upload picture',
    });
  }
});
