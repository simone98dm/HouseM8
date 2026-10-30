-- Clear avatars copied from Google at OAuth sign-up (GDPR audit 2026-10-26)
--
-- Google sign-up used to copy the Google profile photo into avatar_url without
-- the user choosing it. Sign-up no longer does that, and the CSP now only
-- allows images from our own origin, so the copied URLs are cleared. Users see
-- their initials and can upload a photo themselves.
UPDATE users
   SET avatar_url = NULL
 WHERE avatar_url LIKE 'https://%.googleusercontent.com/%';
