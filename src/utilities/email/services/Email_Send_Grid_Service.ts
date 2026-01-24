import axios from 'axios';
import EMAIL_CONFIGURATION from '@/utilities/email/configuration/Email_Configuration';
import type { EmailOptionsInterface, TemplateDataInterface } from '@/utilities/email/interfaces/Email_Interface';
import { renderTemplate } from '@/utilities/email/utitlity/Template_Utility';
import { emailLogger } from '@/utilities/email/logger/Email_Logger';

class EmailSendGridService {
  private apiKey: string;
  private from: string;

  constructor() {
    // Try to get from config, fallback to env
    this.apiKey = (EMAIL_CONFIGURATION as any).sendgridApiKey  || '';
    this.from = EMAIL_CONFIGURATION.from;
    if (!this.apiKey) {
      emailLogger.error('SendGrid API key is not configured.');
    } else {
      emailLogger.info('SendGrid email service is ready to send messages');
    }
  }

  async sendEmail(options: EmailOptionsInterface): Promise<void> {
    try {
      const data: any = {
        personalizations: [
          {
            to: Array.isArray(options.to) ? options.to.map((t) => (typeof t === 'string' ? { email: t } : t)) : [{ email: options.to as string }],
            subject: options.subject,
          },
        ],
        from: { email: this.from },
        content: [
          {
            type: 'text/html',
            value: options.html || '',
          },
        ],
      };
      if (options.attachments && Array.isArray(options.attachments)) {
        // Only include attachments with valid content
        data.attachments = options.attachments
          .filter(att => att && att.content)
          .map(att => ({
            content: typeof att.content === 'string' ? Buffer.from(att.content).toString('base64') : (att.content as Buffer).toString('base64'),
            filename: att.filename,
            type: att.contentType,
            disposition: 'attachment',
          }));
      }
      await axios.post('https://api.sendgrid.com/v3/mail/send', data, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      emailLogger.info('SendGrid email sent successfully');
    } catch (error: any) {
      emailLogger.error('Error sending SendGrid email:', error?.response?.data || error);
      throw error;
    }
  }

  async sendTemplateEmail(
    templateName: string,
    data: TemplateDataInterface,
    options: Omit<EmailOptionsInterface, 'html'>
  ): Promise<void> {
    try {
      const html = await renderTemplate(templateName, data);
      await this.sendEmail({ ...options, html });
    } catch (error) {
      emailLogger.error(`Error sending SendGrid template email (${templateName}):`, error);
      throw error;
    }
  }
}

export default new EmailSendGridService();
