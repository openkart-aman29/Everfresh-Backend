export interface EmailConfigurationInterface {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
    sendgridApiKey: string;
    brevoApiKey:string
}
