/**
 * GET /api-docs
 * Renders the OpenAPI specification using Scalar UI.
 */
export default defineEventHandler((event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }
  setHeader(event, 'Content-Type', 'text/html; charset=utf-8');
  // Page-specific CSP: only this dev-only page may load Scalar from jsdelivr.
  setHeader(
    event,
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: https:",
      "font-src 'self' data: https://cdn.jsdelivr.net",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join('; '),
  );

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>House M8 — API Reference</title>
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/api/openapi"
      data-configuration='{"theme":"purple","layout":"modern"}'
    ></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;
});
