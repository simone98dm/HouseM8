import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * GET /api/openapi
 * Serves the OpenAPI specification file.
 * Accepts: application/json (converts YAML→JSON) or application/yaml (raw YAML)
 */
export default defineEventHandler(async (event) => {
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }
  const filePath = resolve(process.cwd(), 'openapi.yaml');
  const yaml = readFileSync(filePath, 'utf-8');

  const accept = getHeader(event, 'accept') ?? '';

  if (accept.includes('application/json')) {
    // Lazy-import to avoid adding a hard dependency at module load time
    const { parse } = await import('yaml');
    setHeader(event, 'Content-Type', 'application/json');
    return parse(yaml);
  }

  setHeader(event, 'Content-Type', 'application/yaml');
  return yaml;
});
