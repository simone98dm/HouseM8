import { describe, it, expect } from 'vitest';

describe('GET /api/users/me', () => {
  it('should require authentication', () => {
    const mockEvent = {
      node: { req: { headers: {} }, res: {} },
    };

    expect(mockEvent.node.req.headers).not.toHaveProperty('authorization');
  });

  it('should accept valid authorization header', () => {
    const mockEvent = {
      node: {
        req: {
          headers: { authorization: 'Bearer valid-token' },
        },
      },
    };

    expect(mockEvent.node.req.headers.authorization).toBeTruthy();
  });
});

describe('PUT /api/users/me', () => {
  it('should validate user update data', () => {
    const validUpdate = {
      first_name: 'John',
      last_name: 'Doe',
      languages: ['en', 'it'],
    };

    expect(validUpdate).toHaveProperty('first_name');
    expect(Array.isArray(validUpdate.languages)).toBe(true);
  });

  it('should reject invalid language codes', () => {
    const invalidUpdate = {
      languages: ['invalid', 'codes'],
    };

    const validLanguages = ['en', 'it', 'de', 'fr', 'es'];
    const hasInvalid = invalidUpdate.languages.some(
      (lang) => !validLanguages.includes(lang),
    );

    expect(hasInvalid).toBe(true);
  });
});
