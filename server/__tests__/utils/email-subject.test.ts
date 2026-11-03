import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendEmail } from '~~/server/utils/email';

const send = vi.fn();
vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

describe('sendEmail subject sanitising', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RESEND_API_KEY = 'k';
    send.mockResolvedValue({ data: { id: 'm1' }, error: null });
  });

  it('strips CR/LF from subjects', async () => {
    await sendEmail({
      to: 'real@x.com',
      subject: 'Hi\r\nBcc: x',
      html: 'h',
    });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Hi Bcc: x' }),
    );
  });

  it('caps subjects at 200 characters', async () => {
    await sendEmail({ to: 'real@x.com', subject: 'a'.repeat(500), html: 'h' });

    expect(send.mock.calls[0]![0].subject).toHaveLength(200);
  });
});
