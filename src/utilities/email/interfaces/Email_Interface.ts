import type { Attachment } from 'nodemailer/lib/mailer';

export interface EmailOptionsInterface {
  to: string;
  subject: string;
  html: string;
  attachments?: Attachment[];
}

export interface TemplateDataInterface {
  [key: string]: any;
}
