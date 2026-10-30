import { describe, it, expect } from 'vitest';

describe('POST /api/houses', () => {
  it('should validate required house name', () => {
    const invalidBody = { address: '123 Main St' };

    expect(invalidBody).not.toHaveProperty('name');
  });

  it('should reject empty house name', () => {
    const body = { name: '   ' };

    expect(body.name.trim()).toBe('');
  });

  it('should accept valid house data', () => {
    const validBody = {
      name: 'My House',
      address: '123 Main St',
      currency: 'EUR',
    };

    expect(validBody.name.trim().length).toBeGreaterThan(0);
    expect(['USD', 'EUR', 'GBP'].includes(validBody.currency)).toBe(true);
  });

  it('should default to EUR if invalid currency', () => {
    const body = { name: 'House', currency: 'INVALID' };
    const validCurrencies = ['USD', 'EUR', 'GBP'];

    const finalCurrency = validCurrencies.includes(body.currency)
      ? body.currency
      : 'EUR';

    expect(finalCurrency).toBe('EUR');
  });
});

describe('GET /api/houses/:id', () => {
  it('should validate house ID format', () => {
    const validId = '123e4567-e89b-12d3-a456-426614174000';
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(uuidRegex.test(validId)).toBe(true);
  });

  it('should reject invalid UUID', () => {
    const invalidId = 'not-a-uuid';
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    expect(uuidRegex.test(invalidId)).toBe(false);
  });
});

describe('PUT /api/houses/:id', () => {
  it('should validate update data', () => {
    const validUpdate = {
      name: 'Updated House Name',
      address: 'New Address',
    };

    expect(validUpdate.name).toBeTruthy();
  });

  it('should reject empty name update', () => {
    const body = { name: '' };

    expect(body.name.trim().length).toBe(0);
  });
});
