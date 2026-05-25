import { MailService } from './mail.service';
import { createMockConfig, type ConfigService } from '../../test/mock-helpers';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

function makeService(withSmtp = true) {
  const config = createMockConfig();
  const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });
  (nodemailer.createTransport as jest.Mock).mockReturnValue({ sendMail: mockSendMail });

  config.get.mockImplementation((key: string) => {
    if (!withSmtp && key === 'smtp.host') return undefined;
    const map: Record<string, unknown> = {
      'smtp.host': 'smtp.example.com',
      'smtp.port': 587,
      'smtp.user': 'user',
      'smtp.pass': 'pass',
      'smtp.from': 'Test <test@example.com>',
    };
    return map[key];
  });

  const svc = new MailService(config as unknown as ConfigService);
  svc.onModuleInit();
  return { svc, config, mockSendMail };
}

describe('MailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------
  // onModuleInit
  // -------------------------------------------------------------------
  describe('onModuleInit', () => {
    it('creates transport when SMTP host is configured', () => {
      makeService(true);
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          port: 587,
          auth: { user: 'user', pass: 'pass' },
        }),
      );
    });

    it('skips transport when no SMTP host', () => {
      (nodemailer.createTransport as jest.Mock).mockClear();
      makeService(false);
      expect(nodemailer.createTransport).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------
  // send
  // -------------------------------------------------------------------
  describe('send', () => {
    it('calls sendMail with correct from/to/subject/html', async () => {
      const { svc, mockSendMail } = makeService();
      await svc.send({ to: 'a@b.com', subject: 'Hi', html: '<p>Hello</p>' });
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'Test <test@example.com>',
          to: 'a@b.com',
          subject: 'Hi',
          html: '<p>Hello</p>',
        }),
      );
    });

    it('logs to console when no transport (stub mode)', async () => {
      const { svc } = makeService(false);
      const spy = jest.spyOn(console, 'log').mockImplementation();
      await svc.send({ to: 'a@b.com', subject: 'Test', html: '<p>body</p>' });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('a@b.com'));
      spy.mockRestore();
    });

    it('rethrows on sendMail failure', async () => {
      const { svc, mockSendMail } = makeService();
      mockSendMail.mockRejectedValueOnce(new Error('SMTP down'));
      await expect(svc.send({ to: 'a@b.com', subject: 'Fail', html: '' })).rejects.toThrow('SMTP down');
    });
  });

  // -------------------------------------------------------------------
  // sendVerificationEmail
  // -------------------------------------------------------------------
  describe('sendVerificationEmail', () => {
    it('builds correct verification link with encoded token', async () => {
      const { svc, mockSendMail } = makeService();
      await svc.sendVerificationEmail('u@e.com', 'tok&en=1', 'https://app.io/');
      const call = mockSendMail.mock.calls[0][0];
      expect(call.to).toBe('u@e.com');
      expect(call.subject).toContain('Verify');
      expect(call.html).toContain('https://app.io/verify?token=tok%26en%3D1');
    });
  });

  // -------------------------------------------------------------------
  // sendPasswordResetEmail
  // -------------------------------------------------------------------
  describe('sendPasswordResetEmail', () => {
    it('builds correct reset link', async () => {
      const { svc, mockSendMail } = makeService();
      await svc.sendPasswordResetEmail('u@e.com', 'abc123', 'https://app.io');
      const call = mockSendMail.mock.calls[0][0];
      expect(call.to).toBe('u@e.com');
      expect(call.subject).toContain('Reset');
      expect(call.html).toContain('https://app.io/reset-password?token=abc123');
    });
  });

  // -------------------------------------------------------------------
  // sendMagicLink
  // -------------------------------------------------------------------
  describe('sendMagicLink', () => {
    it('builds correct magic link without redirect', async () => {
      const { svc, mockSendMail } = makeService();
      await svc.sendMagicLink('u@e.com', 'magic-tok', 'https://app.io');
      const call = mockSendMail.mock.calls[0][0];
      expect(call.to).toBe('u@e.com');
      expect(call.subject).toContain('sign-in');
      expect(call.html).toContain('https://app.io/magic?token=magic-tok');
      expect(call.html).not.toContain('redirect');
    });

    it('includes redirect param when provided', async () => {
      const { svc, mockSendMail } = makeService();
      await svc.sendMagicLink('u@e.com', 'magic-tok', 'https://app.io', '/dashboard');
      const call = mockSendMail.mock.calls[0][0];
      expect(call.html).toContain('https://app.io/magic?token=magic-tok&redirect=%2Fdashboard');
    });
  });

  // -------------------------------------------------------------------
  // sendWorkspaceInvite
  // -------------------------------------------------------------------
  describe('sendWorkspaceInvite', () => {
    it('builds correct invite link with inviter name and workspace name', async () => {
      const { svc, mockSendMail } = makeService();
      await svc.sendWorkspaceInvite('u@e.com', 'Alice', 'Acme Corp', 'inv-tok', 'https://app.io');
      const call = mockSendMail.mock.calls[0][0];
      expect(call.to).toBe('u@e.com');
      expect(call.subject).toBe('Alice invited you to Acme Corp on MADCreate');
      expect(call.html).toContain('https://app.io/accept-invite?token=inv-tok');
      expect(call.html).toContain('Alice');
      expect(call.html).toContain('Acme Corp');
    });
  });
});
