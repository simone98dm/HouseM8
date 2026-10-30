import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail } from '~~/server/utils/email';

const send = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

describe('sendEmail anon.local guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'k';
    send.mockResolvedValue({ data: { id: 'm1' }, error: null });
  });

  it('does not send to a single anonymised recipient', async () => {
    const r = await sendEmail({
      to: 'deleted-1@anon.local',
      subject: 's',
      html: 'h',
    });
    expect(r.success).toBe(true);
    expect(send).not.toHaveBeenCalled();
  });

  it('drops anonymised recipients from a list and sends to the rest', async () => {
    await sendEmail({
      to: ['deleted-1@anon.local', 'real@x.com'],
      subject: 's',
      html: 'h',
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['real@x.com'] }),
    );
  });

  it('sends normally to a real address', async () => {
    await sendEmail({ to: 'real@x.com', subject: 's', html: 'h' });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'real@x.com' }),
    );
  });
});

describe('sendEmail error handling and anon guard edges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'k';
  });

  it('treats the anon suffix case-insensitively', async () => {
    await sendEmail({ to: 'Deleted-1@ANON.LOCAL', subject: 's', html: 'h' });
    expect(send).not.toHaveBeenCalled();
  });

  it('skips an empty recipient list', async () => {
    expect(await sendEmail({ to: [], subject: 's', html: 'h' })).toEqual({
      success: true,
    });
    expect(send).not.toHaveBeenCalled();
  });

  it('returns the provider error message when Resend rejects the mail', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'bad domain' } });
    expect(await sendEmail({ to: 'a@x.com', subject: 's', html: 'h' })).toEqual(
      { success: false, error: 'bad domain' },
    );
  });

  it('falls back to a generic message when the provider error has none', async () => {
    send.mockResolvedValue({ data: null, error: {} });
    expect(
      (await sendEmail({ to: 'a@x.com', subject: 's', html: 'h' })).error,
    ).toBe('Failed to send email');
  });

  it('catches thrown errors (Error and non-Error)', async () => {
    send.mockRejectedValueOnce(new Error('net'));
    expect(
      (await sendEmail({ to: 'a@x.com', subject: 's', html: 'h' })).error,
    ).toBe('net');
    send.mockRejectedValueOnce('str');
    expect(
      (await sendEmail({ to: 'a@x.com', subject: 's', html: 'h' })).error,
    ).toBe('Unknown error');
  });
});
