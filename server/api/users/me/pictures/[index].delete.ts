import { verifyAuth } from '~~/server/utils/auth';
import { getRepositories } from '~~/server/repositories/factory';
import { getStorageProvider } from '~~/server/providers/storage/factory';

/**
 * DELETE /api/users/me/pictures/[index]
 * Delete a profile picture by index
 *
 * Uses storage provider abstraction for file deletion.
 * Currently supports Supabase Storage. For other providers,
 * implement IStorageProvider (e.g., S3StorageProvider, LocalStorageProvider).
 */
export default defineEventHandler(async (event) => {
  const user = await verifyAuth(event);
  const repos = getRepositories();
  const pictureIndex = Number.parseInt(getRouterParam(event, 'index') || '0');

  if (Number.isNaN(pictureIndex) || pictureIndex < 0) {
    throw createError({
      statusCode: 400,
      message: 'Invalid picture index',
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

  if (pictureIndex >= currentPictures.length) {
    throw createError({
      statusCode: 404,
      message: 'Picture not found',
    });
  }

  const pictureUrl = currentPictures[pictureIndex];

  if (!pictureUrl) {
    throw createError({
      statusCode: 404,
      message: 'Picture URL not found',
    });
  }

  try {
    const storage = getStorageProvider();

    // Extract filename from URL for storage deletion
    const url = new URL(pictureUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts.at(-1);
    const fullPath = `${user.id}/${fileName}`;

    // Delete from storage
    const { error: deleteError } = await storage.delete(
      'profile-pictures',
      fullPath,
    );

    if (deleteError) {
      // Continue with database update even if storage deletion fails
    }

    // Update user profile by removing the picture URL using repository
    const updatedPictures = currentPictures.filter(
      (_, index) => index !== pictureIndex,
    );

    const { data, error: updateError } = await repos.users.update(user.id, {
      profile_pictures: updatedPictures,
    });

    if (updateError) {
      throw createError({
        statusCode: 500,
        message: 'Failed to update user profile',
      });
    }

    return {
      data: {
        user: data,
        deletedPictureUrl: pictureUrl,
      },
    };
  } catch (error: unknown) {
    const errorObj = error as { statusCode?: number; message?: string };
    // Only errors raised here (they carry a statusCode) keep their message.
    throw createError({
      statusCode: errorObj.statusCode || 500,
      message:
        (errorObj.statusCode && errorObj.message) || 'Failed to delete picture',
    });
  }
});
