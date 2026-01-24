import { BREVO_API_KEY, EMAIL_FROM, EMAIL_HOST, EMAIL_PASS, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, SENDGRID_API_KEY } from "@/configurations/ENV_Configuration";
import { EmailConfigurationInterface } from "@/utilities/email/interfaces/Email_Configuration_Interface";

export const EMAIL_CONFIGURATION: EmailConfigurationInterface = {
    host: EMAIL_HOST || 'smtp-relay.brevo.com',
    port: EMAIL_PORT || 587,
    secure: EMAIL_SECURE || false,
    user: EMAIL_USER || 'a06235001@smtp-brevo.com',
    pass: EMAIL_PASS || '',
    from: EMAIL_FROM || 'Everfresh',
    sendgridApiKey: SENDGRID_API_KEY || 'default',
    brevoApiKey: BREVO_API_KEY || 'default'
};

export default EMAIL_CONFIGURATION;
