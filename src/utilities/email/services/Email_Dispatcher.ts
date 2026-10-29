// Sends through whichever email route is actually configured.
//
// The enquiry flow used to call the Brevo HTTP API directly, so a single
// disabled key stopped every email even though a working SMTP transport sat
// beside it. This tries each configured route in turn and only gives up when
// all of them fail, which means one valid credential anywhere is enough:
// a Brevo API key, a Brevo SMTP key, or any other SMTP account.

import EMAIL_CONFIGURATION from '@/utilities/email/configuration/Email_Configuration';
import EmailBrevoService from '@/utilities/email/services/Email_Brevo_Service';
import EmailService from '@/utilities/email/services/Email_Service';
import EmailEtherealService from '@/utilities/email/services/Email_Ethereal_Service';
import { EmailOptionsInterface, TemplateDataInterface } from '@/utilities/email/interfaces/Email_Interface';
import { createFeatureLogger } from '@/utilities/logger/manager/Logger_Manager';

const dispatcherLogger = createFeatureLogger('Email');

type SendOptions = Omit<EmailOptionsInterface, 'html'>;

interface Route {
    name: string;
    configured: () => boolean;
    send: (template: string, data: TemplateDataInterface, options: SendOptions) => Promise<void>;
}

/**
 * `Email_Configuration` substitutes the string 'default' when a key is absent,
 * so an unset key is not an empty string.
 */
const isSet = (value: string | undefined): boolean =>
    Boolean(value) && value !== 'default' && value!.trim().length > 0;

/**
 * Order matters: the HTTP API is tried first because it reports failures
 * quickly and precisely, where SMTP tends to hang before timing out.
 */
const ROUTES: Route[] = [
    {
        name: 'brevo-api',
        configured: () => isSet(EMAIL_CONFIGURATION.brevoApiKey),
        send: (template, data, options) => EmailBrevoService.sendTemplateEmail(template, data, options),
    },
    {
        name: 'smtp',
        configured: () => isSet(EMAIL_CONFIGURATION.pass) && isSet(EMAIL_CONFIGURATION.host),
        send: (template, data, options) => EmailService.sendTemplateEmail(template, data, options),
    },
    {
        // Last resort, development only. Captures rather than delivers, so it
        // must never shadow a real provider - hence its place at the end.
        name: 'ethereal-preview',
        configured: () => EmailEtherealService.isPermitted(),
        send: (template, data, options) =>
            EmailEtherealService.sendTemplateEmail(template, data, options),
    },
];

const describe = (error: unknown): string =>
    error instanceof Error ? error.message : String(error);

/**
 * Renders `template` and sends it by the first route that succeeds.
 * Throws only when every configured route has failed, with all reasons in the
 * message so the logs say what to fix.
 */
export const sendTemplateEmail = async (
    template: string,
    data: TemplateDataInterface,
    options: SendOptions
): Promise<void> => {
    const available = ROUTES.filter((route) => route.configured());

    if (available.length === 0) {
        throw new Error(
            'No email route is configured. Set BREVO_API_KEY, or EMAIL_HOST with EMAIL_USER and EMAIL_PASS.'
        );
    }

    const failures: string[] = [];

    for (const route of available) {
        try {
            await route.send(template, data, options);
            dispatcherLogger.info('Email sent', {
                route: route.name,
                template,
                to: options.to,
                // Only meaningful when an earlier route failed first.
                afterFailures: failures.length > 0 ? failures : undefined,
            });
            return;
        } catch (error) {
            const reason = describe(error);
            failures.push(`${route.name}: ${reason}`);
            dispatcherLogger.warn('Email route failed, trying the next one', {
                route: route.name,
                template,
                reason,
            });
        }
    }

    throw new Error(`All email routes failed - ${failures.join(' | ')}`);
};

export default { sendTemplateEmail };
