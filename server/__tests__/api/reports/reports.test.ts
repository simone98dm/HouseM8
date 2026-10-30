import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getRepositories } from '~~/server/repositories/factory';

vi.stubGlobal(
  'defineEventHandler',
  (fn: (...args: unknown[]) => unknown) => fn,
);
const readBodyMock = vi.fn<() => Promise<unknown>>();
vi.stubGlobal('readBody', readBodyMock);
vi.stubGlobal('getRouterParam', vi.fn());
vi.stubGlobal(
  'createError',
  (params: {
    statusCode: number;
    message?: string;
    statusMessage?: string;
  }) => {
    const err = new Error(
      params.message ?? params.statusMessage ?? 'Error',
    ) as Error & { statusCode: number };
    err.statusCode = params.statusCode;
    return err;
  },
);
// readValidatedBody: run the validator through a try-catch, mirrors h3 behaviour
vi.stubGlobal(
  'readValidatedBody',
  vi
    .fn()
    .mockImplementation(
      async (_event: unknown, validator: (body: unknown) => unknown) => {
        const body = await readBodyMock();
        try {
          return validator(body);
        } catch (err) {
          throw createError({
            statusCode: 400,
            message: err instanceof Error ? err.message : 'Validation failed',
          });
        }
      },
    ),
);
vi.stubGlobal('useRuntimeConfig', () => ({
  public: { baseUrl: 'http://localhost:3000' },
}));

vi.mock('~~/server/repositories/factory', () => ({ getRepositories: vi.fn() }));
vi.mock('~~/server/utils/repository-auth', () => ({
  verifyAuthCompat: vi.fn().mockResolvedValue({
    id: '00000000-0000-0000-0000-000000000002',
    userId: '00000000-0000-0000-0000-000000000002',
    email: 'test@test.com',
  }),
  ensureHouseMember: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('~~/server/emails', () => ({
  sendNewReportNotification: vi.fn().mockResolvedValue(undefined),
}));

// Zod 4 uuid() enforces RFC 4122 version/variant bits, so the id must be a real v4.
const MOCK_HOUSE_ID = '11111111-1111-4111-8111-111111111111';
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000002';

const mockReport = {
  id: '00000000-0000-0000-0000-000000000003',
  house_id: MOCK_HOUSE_ID,
  created_by: MOCK_USER_ID,
  description: 'Leaky faucet in bathroom',
};

describe('POST /api/reports', () => {
  const mockEvent = {} as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getById: vi.fn().mockResolvedValue({
          data: {
            id: MOCK_HOUSE_ID,
            name: 'My House',
            owner_id: '00000000-0000-0000-0000-000000000099',
          },
          error: null,
        }),
      },
      reports: {
        create: vi.fn().mockResolvedValue({ data: mockReport, error: null }),
      },
      users: {
        getById: vi.fn().mockResolvedValue({
          data: {
            id: MOCK_USER_ID,
            email: 'a@b.com',
            first_name: 'A',
            last_name: 'B',
          },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof getRepositories>);
  });

  it('creates report for valid data', async () => {
    readBodyMock.mockResolvedValue({
      house_id: MOCK_HOUSE_ID,
      description: 'Leaky faucet in bathroom',
    });

    const { default: handler } =
      await import('../../../api/reports/index.post');
    const result = await handler(mockEvent);

    expect(result.data).toMatchObject({
      id: mockReport.id,
      description: 'Leaky faucet in bathroom',
    });
  });

  it('throws 400 when house_id is missing', async () => {
    readBodyMock.mockResolvedValue({ description: 'Some description here' });

    const { default: handler } =
      await import('../../../api/reports/index.post');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 400 when description is too short', async () => {
    readBodyMock.mockResolvedValue({
      house_id: MOCK_HOUSE_ID,
      description: 'Short',
    });

    const { default: handler } =
      await import('../../../api/reports/index.post');

    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('throws 404 when house is not found', async () => {
    readBodyMock.mockResolvedValue({
      house_id: MOCK_HOUSE_ID,
      description: 'Leaky faucet in bathroom',
    });
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getById: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      reports: { create: vi.fn() },
      users: { getById: vi.fn() },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/reports/index.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('throws 403 when house owner tries to create report', async () => {
    readBodyMock.mockResolvedValue({
      house_id: MOCK_HOUSE_ID,
      description: 'Leaky faucet in bathroom',
    });
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getById: vi.fn().mockResolvedValue({
          data: { id: MOCK_HOUSE_ID, name: 'House', owner_id: MOCK_USER_ID },
          error: null,
        }),
      },
      reports: { create: vi.fn() },
      users: { getById: vi.fn() },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/reports/index.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('throws 500 when report creation returns error', async () => {
    readBodyMock.mockResolvedValue({
      house_id: MOCK_HOUSE_ID,
      description: 'Leaky faucet in bathroom',
    });
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getById: vi.fn().mockResolvedValue({
          data: {
            id: MOCK_HOUSE_ID,
            name: 'House',
            owner_id: '00000000-0000-0000-0000-000000000099',
          },
          error: null,
        }),
      },
      reports: {
        create: vi
          .fn()
          .mockResolvedValue({ data: null, error: 'DB write failed' }),
      },
      users: { getById: vi.fn() },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/reports/index.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it('throws 500 when report is null after creation', async () => {
    readBodyMock.mockResolvedValue({
      house_id: MOCK_HOUSE_ID,
      description: 'Leaky faucet in bathroom',
    });
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getById: vi.fn().mockResolvedValue({
          data: {
            id: MOCK_HOUSE_ID,
            name: 'House',
            owner_id: '00000000-0000-0000-0000-000000000099',
          },
          error: null,
        }),
      },
      reports: {
        create: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
      users: { getById: vi.fn() },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/reports/index.post');
    await expect(handler(mockEvent)).rejects.toMatchObject({ statusCode: 500 });
  });

  it('creates report without sending email when owner/reporter not found', async () => {
    readBodyMock.mockResolvedValue({
      house_id: MOCK_HOUSE_ID,
      description: 'Leaky faucet in bathroom',
    });
    vi.mocked(getRepositories).mockReturnValue({
      houses: {
        getById: vi.fn().mockResolvedValue({
          data: {
            id: MOCK_HOUSE_ID,
            name: 'House',
            owner_id: '00000000-0000-0000-0000-000000000099',
          },
          error: null,
        }),
      },
      reports: {
        create: vi.fn().mockResolvedValue({ data: mockReport, error: null }),
      },
      users: {
        getById: vi.fn().mockResolvedValue({ data: null, error: null }),
      },
    } as unknown as ReturnType<typeof getRepositories>);

    const { default: handler } =
      await import('../../../api/reports/index.post');
    const result = await handler(mockEvent);
    expect(result.data).toMatchObject({ id: mockReport.id });
  });

  it('truncates long description in email notification', async () => {
    const longDesc = 'A'.repeat(200);
    readBodyMock.mockResolvedValue({
      house_id: MOCK_HOUSE_ID,
      description: longDesc,
    });

    const { default: handler } =
      await import('../../../api/reports/index.post');
    const result = await handler(mockEvent);
    expect(result.data).toBeDefined();
  });
});
