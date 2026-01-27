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

/**
 * Trust proxy (IMPORTANT for rate-limit, real IPs behind Nginx/Proxmox)
 * 1 = trust first proxy
 */
app.set('trust proxy', 1);

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
    origin: ENV.ALLOWED_ORIGINS.split(','),
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