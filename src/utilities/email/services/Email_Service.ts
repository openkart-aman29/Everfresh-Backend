 import nodemailer from 'nodemailer';
import EMAIL_CONFIGURATION from '@/utilities/email/configuration/Email_Configuration';
import type { EmailOptionsInterface, TemplateDataInterface } from '@/utilities/email/interfaces/Email_Interface';
import type { Attachment } from 'nodemailer/lib/mailer';
import { renderTemplate } from '@/utilities/email/utitlity/Template_Utility';
import { emailLogger } from '@/utilities/email/logger/Email_Logger';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: EMAIL_CONFIGURATION.host,
      port: EMAIL_CONFIGURATION.port,
      secure: EMAIL_CONFIGURATION.secure,
      auth: {
        user: EMAIL_CONFIGURATION.user,
        pass: EMAIL_CONFIGURATION.pass,
      },
    });

    // Verify connection configuration
    this.transporter.verify((error: Error | null, success: boolean) => {
      if (error) {
        emailLogger.error('Email service configuration error:', error);
      } else {
        emailLogger.info('Email service is ready to send messages');
      }
    });
  }

  async sendEmail(options: EmailOptionsInterface): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: EMAIL_CONFIGURATION.from,
        ...options,
      });
      emailLogger.info('Email sent successfully:', info.messageId);
    } catch (error) {
      emailLogger.error('Error sending email:', error);
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
      emailLogger.error(`Error sending template email (${templateName}):`, error);
      throw error;
    }
  }
}

export default new EmailService();
