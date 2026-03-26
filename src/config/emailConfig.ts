import nodemailer from 'nodemailer';
import SMTP2GOApi from 'smtp2go-nodejs';

// 1. Setup traditional SMTP backup transporter (Nodemailer)
const standardTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.smtp2go.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_PORT === '465', // Must be true for 465
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
});

// Define interface for our transporter
type MailOptions = {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
};

let transporter: { sendMail: (options: MailOptions) => Promise<any> };

// 2. Use SMTP2GO API if API key is provided in .env
if (process.env.SMTP2GO_API_KEY) {
  const func = (SMTP2GOApi as any).default || SMTP2GOApi;
  const api = func(process.env.SMTP2GO_API_KEY);
  const client = api.client();

  transporter = {
    sendMail: async (options: MailOptions) => {
      const mailService = api.mail();

      // Parse sender "Name <email@xyz.com>" format into Address { email, name }
      const fromMatch = options.from.match(/(?:"?([^"]*)"?\s+)?<([^>]+)>/);
      const fromAddress = {
        email: fromMatch ? fromMatch[2] : options.from,
        name: fromMatch ? fromMatch[1] : undefined
      };

      mailService.from(fromAddress as any);

      // Handle arrays or comma-separated strings for "to" Addresses
      const toAddresses = Array.isArray(options.to)
        ? options.to
        : options.to.split(',').map(email => email.trim());

      toAddresses.forEach(email => {
        mailService.addAddress({ email } as any, 'to' as any);
      });

      mailService.subject(options.subject);

      if (options.html) mailService.html(options.html);
      if (options.text) mailService.text(options.text);

      const response = await client.consume(mailService);

      if (response && response.data && response.data.error) {
        throw new Error(response.data.error);
      }

      return {
        messageId: response.data ? response.data.request_id || 'api_sent' : 'api_sent'
      };
    }
  };
} else {
  // Otherwise, use Nodemailer
  transporter = {
    sendMail: async (options: MailOptions) => {
      return standardTransporter.sendMail(options);
    }
  };
}

export default transporter;
