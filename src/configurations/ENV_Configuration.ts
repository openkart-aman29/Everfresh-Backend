// import { cleanEnv, str, num, port } from 'envalid';

// export const ENV = cleanEnv(process.env, {
//     NODE_ENV: str({ choices: ['development', 'production', 'test'] }),
//     PORT: port({ default: 5000 }),

//     // Database
//     DB_HOST: str(),
//     DB_PORT: port({ default: 5432 }),
//     DB_NAME: str(),
//     DB_USER: str(),
//     DB_PASSWORD: str(),

//     // JWT
//     JWT_ACCESS_TOKEN_EXPIRATION: num({ default: 900 }),     // 15 minutes
//     JWT_REFRESH_TOKEN_EXPIRATION: num({ default: 604800 }), // 7 days
// JWT_PRIVATE_KEY_PATH: str({ default: './rsa-keys/private.pem' }),
// JWT_PUBLIC_KEY_PATH: str({ default: './rsa-keys/public.pem' }),

//     // Security
//     ALLOWED_ORIGINS: str({ default: 'http://localhost:3000' }),
//     RATE_LIMIT_WINDOW_MS: num({ default: 600000 }),         // 10 minutes
//     RATE_LIMIT_MAX_REQUESTS: num({ default: 10000 }),

//     // Argon2
//     ARGON2_MEMORY_COST: num({ default: 65536 }),
//     ARGON2_TIME_COST: num({ default: 3 }),
//     ARGON2_PARALLELISM: num({ default: 2 }),
// });


import dotenv from 'dotenv';
import path from 'path';

// Load `.env` first
dotenv.config({
    path: path.resolve(__dirname, '../../envs/.env'),
});
import { cleanEnv, str, num, port, bool } from 'envalid';

export const ENV = cleanEnv(process.env, {
    // # =========================
    // # ENVIRONMENT
    // # =========================
    NODE_ENV: str({ choices: ['development', 'production', 'test'] }),
    PORT: port({ default: 5000 }),

    // # =========================
    // # DATABASE (PostgreSQL)
    // # =========================
    DB_HOST: str(),
    DB_PORT: port({ default: 5432 }),
    DB_NAME: str(),
    DB_USER: str(),
    DB_PASSWORD: str(),
    DB_MAX_POOL_SIZE: num({ default: 20 }),
    DB_MIN_POOL_SIZE: num({ default: 2 }),
    DB_IDLE_TIMEOUT_MS: num({ default: 30000 }),
    DB_CONNECTION_TIMEOUT_MS: num({ default: 20000 }),

    // # =========================
    // # JWT
    // # =========================
    JWT_ISSUER: str({ default: 'everfresh-api' }),
    JWT_AUDIENCE: str({ default: 'everfresh-client' }),
    JWT_ACCESS_TOKEN_EXPIRATION: num({ default: 900 }),
    // JWT_ACCESS_TOKEN_EXPIRATION: num({ default: 30 }),
    JWT_REFRESH_TOKEN_EXPIRATION: num({ default: 604800 }),

    JWT_PRIVATE_KEY_PATH: str({ default: './rsa-keys/private.pem' }),
    JWT_PUBLIC_KEY_PATH: str({ default: './rsa-keys/public.pem' }),


    // # =========================
    // # COOKIE (DEV)
    // # =========================
    // Keep cookie name backward-compatible with frontend apps
    REFRESH_TOKEN_COOKIE_NAME: str({ default: 'refreshToken' }),
    // Use root path so cookie is available to signout and other endpoints
    REFRESH_TOKEN_COOKIE_PATH: str({ default: '/' }),
    REFRESH_TOKEN_COOKIE_SECURE: str({ default: 'true' }),
    REFRESH_TOKEN_COOKIE_HTTP_ONLY: str({ default: 'true' }),
    // For cross-origin admin dashboard, default to 'none' (set via .env if needed)
    REFRESH_TOKEN_COOKIE_SAME_SITE: str({ default: 'none' }),
    COOKIE_DOMAIN: str({ default: 'www.admin.everfresh.ae' }),
    // COOKIE_DOMAIN: str({ default: 'localhost' }),


    // # =========================
    // # SECURITY
    // # =========================
    // Security
    HEADER_AUTH_BEARER: str({ default: 'Bearer' }),
    ALLOWED_ORIGINS: str({ default: 'http://admin.everfresh.ae, https://www.everfresh.ae, http://localhost:5173' }),
    RATE_LIMIT_WINDOW_MS: num({ default: 600000 }),
    RATE_LIMIT_MAX_REQUESTS: num({ default: 10000 }),
    FRONTEND_URL: str({ default: 'https://www.everfresh.ae' }),
    // FRONTEND_URL: str({ default: 'https://localhost:5173/' }),


    // # =========================
    // # TOKEN CLEANUP JOBS
    // # =========================

    MARK_EXPIRY_TOKEN_TIME_INTERVAL: num({ default: 3600000 }),
    DELETE_EXPIRED_REFRESH_TOKEN_INTERVAL: num({ default: 86400000 }),
    REFRESH_TOKEN_EXPIRATION: num({ default: 604800 }),
    ACCESS_TOKEN_EXPIRATION: num({ default: 900 }),

    // # =========================
    // # ARGON2
    // # =========================
    ARGON2_MEMORY_COST: num({ default: 65536 }),
    ARGON2_TIME_COST: num({ default: 3 }),
    ARGON2_PARALLELISM: num({ default: 2 }),

    // # =========================
    // # EMAIL
    // # =========================
    EMAIL_HOST: str({ default: 'smtp-relay.brevo.com' }),
    EMAIL_PORT: num({ default: 587 }),
    EMAIL_SECURE: bool({ default: false }),
    EMAIL_USER: str({ default: 'a06235001@smtp-brevo.com' }),
    EMAIL_PASS: str({ default: '' }),
    EMAIL_FROM: str({ default: 'everfresh' }),
    SENDGRID_API_KEY: str({ default: '' }),
    BREVO_API_KEY: str({ default: '' }),
    // # =========================
    // # LOGGING
    // # =========================
    LOG_RETENTION_DAYS: num({ default: 30 }),
    LOG_CONSOLE_PRODUCTION: bool({ default: false }),
    TIMEZONE: str({ default: 'UTC' }),
});


export const {
    NODE_ENV,
    PORT,
    DB_HOST,
    DB_PORT,
    DB_NAME,
    DB_USER,
    DB_PASSWORD,
    DB_MAX_POOL_SIZE,
    DB_MIN_POOL_SIZE,
    DB_IDLE_TIMEOUT_MS,
    DB_CONNECTION_TIMEOUT_MS,
    JWT_ISSUER,
    JWT_AUDIENCE,
    JWT_ACCESS_TOKEN_EXPIRATION,
    JWT_REFRESH_TOKEN_EXPIRATION,
    JWT_PRIVATE_KEY_PATH,
    JWT_PUBLIC_KEY_PATH,
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_PATH,
    REFRESH_TOKEN_COOKIE_SECURE,
    REFRESH_TOKEN_COOKIE_HTTP_ONLY,
    REFRESH_TOKEN_COOKIE_SAME_SITE,
    // JWT
    REFRESH_TOKEN_EXPIRATION: REFRESH_TOKEN_EXPIRATION_TIME,
    ACCESS_TOKEN_EXPIRATION: ACCESS_TOKEN_EXPIRATION_TIME,
    MARK_EXPIRY_TOKEN_TIME_INTERVAL,
    DELETE_EXPIRED_REFRESH_TOKEN_INTERVAL,

    COOKIE_DOMAIN,
    FRONTEND_URL,

    // LOGGING
    LOG_RETENTION_DAYS,
    LOG_CONSOLE_PRODUCTION,
    TIMEZONE,

    // EMAIL
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_SECURE,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_FROM,
    SENDGRID_API_KEY,
    BREVO_API_KEY,
} = ENV;