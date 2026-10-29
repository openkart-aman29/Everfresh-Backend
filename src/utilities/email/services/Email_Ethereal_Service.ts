// Development-only fallback that renders and captures mail with no credentials.
//
// Nodemailer's Ethereal service mints a throwaway SMTP account on demand, so
// this needs no provider account at all. Mail is captured rather than
// delivered, and the log line carries a preview URL showing the real rendered
// email. That proves the whole pipeline - template, data, transport - while a
// real provider key is unavailable.
//
// Never runs in production: see the NODE_ENV guard in Email_Dispatcher.

import nodemailer, { Transporter } from 'nodemailer';
import { NODE_ENV } from '@/configurations/ENV_Configuration';
import EMAIL_CONFIGURATION from '@/utilities/email/configuration/Email_Configuration';
import { EmailOptionsInterface, TemplateDataInterface } from '@/utilities/email/interfaces/Email_Interface';
import { renderTemplate } from '@/utilities/email/utitlity/Template_Utility';
import { createFeatureLogger } from '@/utilities/logger/manager/Logger_Manager';

const etherealLogger = createFeatureLogger('Email');

class EmailEtherealService {
    /**
     * The in-flight creation, not the finished transporter.
     *
     * Enquiry mail is sent detached, so the office copy and the visitor's
     * confirmation start at the same moment. Caching the resolved transporter
     * let both callers find it still unset and mint an account each, which put
     * the two previews in different mailboxes. Caching the promise means the
     * second caller waits on the first one's account.
     */
    private creating?: Promise<Transporter>;

    /** Created once, lazily: the account only exists if a send is attempted. */
    private getTransporter(): Promise<Transporter> {
        if (!this.creating) {
            this.creating = this.createTransporter().catch((error) => {
                // Let a later send retry rather than caching a failure forever.
                this.creating = undefined;
                throw error;
            });
        }
        return this.creating;
    }

    private async createTransporter(): Promise<Transporter> {
        const account = await nodemailer.createTestAccount();

        etherealLogger.warn('Using the Ethereal preview mailbox - no mail is delivered', {
            action: 'EMAIL_ETHEREAL',
            mailbox: account.user,
        });

        return nodemailer.createTransport({
            host: account.smtp.host,
            port: account.smtp.port,
            secure: account.smtp.secure,
            auth: { user: account.user, pass: account.pass },
        });
    }

    async sendTemplateEmail(
        templateName: string,
        data: TemplateDataInterface,
        options: Omit<EmailOptionsInterface, 'html'>
    ): Promise<void> {
        const html = await renderTemplate(templateName, data);
        const transporter = await this.getTransporter();

        const info = await transporter.sendMail({
            from: EMAIL_CONFIGURATION.from,
            to: options.to,
            subject: options.subject,
            html,
        });

        // The whole point of this transport: a link to the rendered email.
        etherealLogger.info('Email captured - open the preview to read it', {
            action: 'EMAIL_ETHEREAL',
            template: templateName,
            intendedFor: options.to,
            preview: nodemailer.getTestMessageUrl(info) || null,
        });
    }

    /** Guard kept beside the service so the rule travels with the code. */
    isPermitted(): boolean {
        return NODE_ENV !== 'production';
    }
}

export default new EmailEtherealService();
