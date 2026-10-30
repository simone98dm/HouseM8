import {
  verifyAuthCompat,
  ensureBulletinNoteCreator,
} from '~~/server/utils/repository-auth';
import { getRepositories } from '~~/server/repositories/factory';

export default defineEventHandler(async (event) => {
  const user = await verifyAuthCompat(event);
  const noteId = getRouterParam(event, 'id');

  if (!noteId) {
    throw createError({
      statusCode: 400,
      message: 'Note ID is required',
    });
  }

  // Verify user owns the note
  await ensureBulletinNoteCreator(noteId, user.id);

  const repos = getRepositories();
  const { error } = await repos.bulletinNotes.delete(noteId);

  if (error) {
    throw createError({
      statusCode: 500,
      message: error,
    });
  }

  return { success: true };
});
