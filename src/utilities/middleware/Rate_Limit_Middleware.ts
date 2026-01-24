import rateLimit from 'express-rate-limit';
import { ENV } from '@/configurations/ENV_Configuration';

export const rateLimitMiddleware = rateLimit({
    windowMs: ENV.RATE_LIMIT_WINDOW_MS,
    max: ENV.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});