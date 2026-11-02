import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import { ENV } from '@/configurations/ENV_Configuration';
import { createMainRouter } from '@/router/Main_Router';
import { createFeatureLogger } from '@/utilities/logger/manager/Logger_Manager';
import { getDatabase } from '@/database/Database_Connection_Manager';

const appLogger = createFeatureLogger('App');

const app = express();

app.set('trust proxy', 1); 

// Normalise X-Forwarded-For before anything reads req.ip.
//
// IIS's ARR module appends the client's source port to the header -
// "2.50.14.37:57914" - where nginx sends a bare address. Express hands that
// whole string back as req.ip, express-rate-limit v7 validates it, and every
// request arriving through IIS threw ERR_ERL_INVALID_IP_ADDRESS.
//
// Stripping the port here fixes req.ip once for the rate limiter, Morgan's
// access log and the SSE client record, rather than passing a custom
// keyGenerator to each consumer. Behind nginx it is a no-op, since nginx never
// appends a port.
const stripForwardedPort = (value: string): string => {
    // [2001:db8::1]:57914 -> 2001:db8::1
    const bracketed = /^\[(.+)\]:\d+$/.exec(value);
    if (bracketed) return bracketed[1];

    // 2.50.14.37:57914 -> 2.50.14.37. Anchored to four dotted octets so that a
    // bare IPv6 address, which is itself full of colons, is left untouched.
    const withPort = /^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/.exec(value);
    return withPort ? withPort[1] : value;
};

app.use((req, _res, next) => {
    const forwarded = req.headers['x-forwarded-for'];

    if (typeof forwarded === 'string' && forwarded.includes(':')) {
        req.headers['x-forwarded-for'] = forwarded
            .split(',')
            .map((part) => stripForwardedPort(part.trim()))
            .join(', ');
    }

    next();
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

// CORS configuration
const corsOptions = {
    // Trim: the list is written with spaces after commas, and an untrimmed
    // " https://example.com" never matches an Origin header.
    origin: ENV.ALLOWED_ORIGINS.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Request logging (Morgan)
const stream = {
    write: (message: string) => {
        appLogger.info(message.trim(), { type: 'Access Log' });
    },
};

app.use(
    morgan(ENV.NODE_ENV === 'production' ? 'combined' : 'dev', { stream })
);

// Rate limiting
const limiter = rateLimit({
    windowMs: ENV.RATE_LIMIT_WINDOW_MS,
    max: ENV.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Health check
app.get('/health', async (req, res) => {
    try {
        const pool = getDatabase();
        let dbStatus = 'disconnected';

        if (pool) {
            await pool.query('SELECT 1');
            dbStatus = 'connected';
        }

        res.status(200).json({
            status: 'OK',
            timestamp: new Date().toISOString(),
            database: dbStatus
        });
    } catch (error: any) {
        appLogger.error('Health check failed', error);
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            database: 'error',
            message: error.message
        });
    }
});

// API routes
app.use('/api/v1', createMainRouter());

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
        status: 404,
        code: 'NOT_FOUND',
        data: null,
        errors: []
    });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    appLogger.error('Unhandled error', err);

    const status = err.status || 500;
    const message = ENV.NODE_ENV === 'production' ? 'Internal server error' : err.message;

    res.status(status).json({
        success: false,
        message,
        status,
        code: 'INTERNAL_ERROR',
        data: null,
        errors: ENV.NODE_ENV === 'development' ? [{ field: 'error', message: err.stack }] : []
    });
});

export default app;