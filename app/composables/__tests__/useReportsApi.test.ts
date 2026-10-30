/**
 * useReportsApi Composable Tests
 * Tests the real useReportsApi module with a mocked useApi composable.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Report, ReportImage } from '~/types';

// ── mock useApi ───────────────────────────────────────────────────────────────
// We mock the composable module so the real useReportsApi picks up our fetch spy.

let mockFetch: ReturnType<typeof vi.fn>;

vi.mock('~/composables/useApi', () => ({
  useApi: () => ({
    fetch: (...args: unknown[]) =>
      (mockFetch as (...a: unknown[]) => unknown)(...args),
  }),
}));

// ── helpers ───────────────────────────────────────────────────────────────────

const getApi = async () => {
  const { useReportsApi } = await import('~/composables/useReportsApi');
  return useReportsApi();
};

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockFetch = vi.fn();
  vi.resetModules();
});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('useReportsApi Composable', () => {
  describe('getUserReports', () => {
    it('fetches user reports with default pagination', async () => {
      const api = await getApi();
      const mockResponse = {
        data: [] as Report[],
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await api.getUserReports();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reports/user',
        { params: { page: '1', limit: '20' } },
        false,
      );
      expect(result).toEqual(mockResponse);
    });

    it('passes optional status param', async () => {
      const api = await getApi();
      mockFetch.mockResolvedValue({
        data: [],
        pagination: { page: 2, limit: 10, total: 0, total_pages: 0 },
      });

      await api.getUserReports('not_read', 2, 10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reports/user',
        { params: { page: '2', limit: '10', status: 'not_read' } },
        false,
      );
    });

    it('returns null on error', async () => {
      const api = await getApi();
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await api.getUserReports();

      expect(result).toBeNull();
    });
  });

  describe('getOwnerReports', () => {
    it('fetches owner reports with default pagination', async () => {
      const api = await getApi();
      const mockResponse = {
        data: [] as Report[],
        pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await api.getOwnerReports();

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reports/owner',
        { params: { page: '1', limit: '20' } },
        false,
      );
      expect(result).toEqual(mockResponse);
    });

    it('passes optional status param', async () => {
      const api = await getApi();
      mockFetch.mockResolvedValue({
        data: [],
        pagination: { page: 3, limit: 5, total: 0, total_pages: 0 },
      });

      await api.getOwnerReports('solved', 3, 5);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reports/owner',
        { params: { page: '3', limit: '5', status: 'solved' } },
        false,
      );
    });

    it('returns null on error', async () => {
      const api = await getApi();
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await api.getOwnerReports();

      expect(result).toBeNull();
    });
  });

  describe('getReport', () => {
    it('fetches a single report by ID', async () => {
      const api = await getApi();
      const mockReport = { id: 'report-1', description: 'Test' } as Report;
      mockFetch.mockResolvedValue({ data: mockReport });

      const result = await api.getReport('report-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reports/report-1',
        {},
        false,
      );
      expect(result).toEqual(mockReport);
    });

    it('returns null on error', async () => {
      const api = await getApi();
      mockFetch.mockRejectedValue(new Error('Not found'));

      const result = await api.getReport('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createReport', () => {
    it('creates a report and returns the created data', async () => {
      const api = await getApi();
      const payload = { house_id: 'house-1', description: 'Broken door' };
      const mockReport = { id: 'new-report', ...payload } as Report;
      mockFetch.mockResolvedValue({ data: mockReport });

      const result = await api.createReport(payload);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reports',
        { method: 'POST', body: payload },
        true,
      );
      expect(result).toEqual(mockReport);
    });

    it('returns null on error', async () => {
      const api = await getApi();
      mockFetch.mockRejectedValue(new Error('Validation error'));

      const result = await api.createReport({
        house_id: 'house-1',
        description: 'x',
      });

      expect(result).toBeNull();
    });
  });

  describe('uploadReportImages', () => {
    it('uploads files using FormData and returns image data', async () => {
      const api = await getApi();
      const mockImages = [
        { id: 'img-1', url: 'https://example.com/img.jpg' },
      ] as ReportImage[];
      mockFetch.mockResolvedValue({ data: mockImages });

      const file = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });
      const result = await api.uploadReportImages('report-1', [file]);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reports/report-1/images',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(FormData),
        }),
        true,
      );
      expect(result).toEqual(mockImages);
    });

    it('returns null on error', async () => {
      const api = await getApi();
      mockFetch.mockRejectedValue(new Error('Upload failed'));

      const file = new File(['x'], 'x.jpg', { type: 'image/jpeg' });
      const result = await api.uploadReportImages('report-1', [file]);

      expect(result).toBeNull();
    });
  });

  describe('markAsRead', () => {
    it('sends PATCH to the read endpoint', async () => {
      const api = await getApi();
      const mockReport = {
        id: 'report-1',
        status: 'read',
      } as unknown as Report;
      mockFetch.mockResolvedValue({ data: mockReport });

      const result = await api.markAsRead('report-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reports/report-1/read',
        { method: 'PATCH' },
        false,
      );
      expect(result).toEqual(mockReport);
    });

    it('returns null on error', async () => {
      const api = await getApi();
      mockFetch.mockRejectedValue(new Error('Forbidden'));

      const result = await api.markAsRead('report-1');

      expect(result).toBeNull();
    });
  });

  describe('markAsSolved', () => {
    it('sends PATCH to the solved endpoint', async () => {
      const api = await getApi();
      const mockReport = {
        id: 'report-1',
        status: 'solved',
      } as unknown as Report;
      mockFetch.mockResolvedValue({ data: mockReport });

      const result = await api.markAsSolved('report-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reports/report-1/solved',
        { method: 'PATCH' },
        false,
      );
      expect(result).toEqual(mockReport);
    });

    it('returns null on error', async () => {
      const api = await getApi();
      mockFetch.mockRejectedValue(new Error('Forbidden'));

      const result = await api.markAsSolved('report-1');

      expect(result).toBeNull();
    });
  });

  describe('deleteReport', () => {
    it('sends DELETE and returns true on success', async () => {
      const api = await getApi();
      mockFetch.mockResolvedValue(undefined);

      const result = await api.deleteReport('report-1');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/reports/report-1',
        { method: 'DELETE' },
        false,
      );
      expect(result).toBe(true);
    });

    it('returns false on error', async () => {
      const api = await getApi();
      mockFetch.mockRejectedValue(new Error('Not found'));

      const result = await api.deleteReport('nonexistent');

      expect(result).toBe(false);
    });
  });
});
