import * as SibApiV3Sdk from '@getbrevo/brevo';
import EMAIL_CONFIGURATION from '@/utilities/email/configuration/Email_Configuration';
import type { EmailOptionsInterface, TemplateDataInterface } from '@/utilities/email/interfaces/Email_Interface';
import { renderTemplate } from '@/utilities/email/utitlity/Template_Utility';
import { emailLogger } from '@/utilities/email/logger/Email_Logger';

class EmailBrevoService {
  private apiInstance?: SibApiV3Sdk.TransactionalEmailsApi;
  private from: string;

  constructor() {
    const apiKey = (EMAIL_CONFIGURATION as any).brevoApiKey || '';
    this.from = EMAIL_CONFIGURATION.from;

    if (!apiKey) {
      emailLogger.error('Brevo API key is not configured.');
    } else {
      this.apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
      this.apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, apiKey);
      emailLogger.info('Brevo email service is ready to send messages');
    }
  }

  async sendEmail(options: EmailOptionsInterface): Promise<void> {
    try {
      if (!this.apiInstance) {
        throw new Error('Brevo API not initialized. Please check your API key configuration.');
      }

      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

      // Set recipients
      if (Array.isArray(options.to)) {
        sendSmtpEmail.to = options.to.map((recipient) =>
          typeof recipient === 'string' ? { email: recipient } : recipient
        );
      } else {
        sendSmtpEmail.to = [{ email: options.to as string }];
      }

      sendSmtpEmail.sender = { email: this.from };
      sendSmtpEmail.subject = options.subject;
      sendSmtpEmail.htmlContent = options.html;

      if (options.attachments && Array.isArray(options.attachments)) {
        const validAttachments = options.attachments.filter(att => att && att.content);
        if (validAttachments.length > 0) {
          sendSmtpEmail.attachment = validAttachments.map(att => ({
            name: att.filename || 'attachment',
            content: typeof att.content === 'string'
              ? Buffer.from(att.content).toString('base64')
              : (att.content as Buffer).toString('base64')
          }));
        }
      }

      const response = await this.apiInstance.sendTransacEmail(sendSmtpEmail);
      emailLogger.info('Brevo email sent successfully', { messageId: response.body?.messageId || 'unknown' });
    } catch (error: any) {
      // ✅ FIX: Extract only serializable error info
      const errorInfo = {
        message: error?.message || 'Unknown error',
        statusCode: error?.response?.statusCode || error?.statusCode,
        body: error?.response?.body,
      };
      emailLogger.error('Error sending Brevo email:', errorInfo);
      throw new Error(errorInfo.message);
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
    } catch (error: any) {
      // ✅ FIX: Extract serializable error info
      const errorInfo = {
        template: templateName,
        message: error?.message || 'Unknown error',
        statusCode: error?.response?.statusCode || error?.statusCode,
      };
      emailLogger.error(`Error sending Brevo template email:`, errorInfo);
      throw new Error(errorInfo.message);
    }
  }
}

export default new EmailBrevoService();