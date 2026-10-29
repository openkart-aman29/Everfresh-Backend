import { ENV } from '@/configurations/ENV_Configuration';
import { readHealthDAO } from '@/features/health/operations/read/dao/Read_Health_Dao';
import { healthLogger } from '@/features/health/logger/Health_Logger';
import {
    HealthResponse,
    LivenessResponse,
    ProcessHealth,
    ReadinessResponse
} from '@/features/health/interfaces/Health_Response.interface';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';

const APP_VERSION = process.env.npm_package_version ?? '1.0.0';

const toMegabytes = (bytes: number): number => Math.round((bytes / 1024 / 1024) * 100) / 100;

const collectProcessHealth = (): ProcessHealth => {
    const memory = process.memoryUsage();

    return {
        uptime_seconds: Math.round(process.uptime()),
        memory_mb: {
            rss: toMegabytes(memory.rss),
            heap_used: toMegabytes(memory.heapUsed),
            heap_total: toMegabytes(memory.heapTotal)
        },
        node_version: process.version,
        pid: process.pid
    };
};

/**
 * Full health report: process vitals plus a live database probe.
 * Always returns 200 so monitoring can read the payload; the `state`
 * field carries the verdict.
 */
export const readHealthService = async (): Promise<StandardResponseInterface<HealthResponse>> => {
    const database = await readHealthDAO.checkDatabase();
    const state = database.status === 'connected' ? 'healthy' : 'unhealthy';

    const data: HealthResponse = {
        state,
        timestamp: new Date().toISOString(),
        environment: ENV.NODE_ENV,
        version: APP_VERSION,
        database,
        process: collectProcessHealth()
    };

    if (state === 'healthy') {
        healthLogger.info('Health check passed', {
            action: 'READ_HEALTH',
            databaseLatencyMs: database.latency_ms
        });
    } else {
        healthLogger.warn('Health check reported an unhealthy service', {
            action: 'READ_HEALTH',
            database
        });
    }

    return {
        success: true,
        status: 200,
        message: 'HEALTH_FETCHED_SUCCESSFULLY',
        code: 'SUCCESS',
        data,
        errors: []
    };
};

/**
 * Liveness probe: is the process running at all? Never touches the
 * database, so an orchestrator does not restart the app over a
 * transient database outage.
 */
export const readLivenessService = (): StandardResponseInterface<LivenessResponse> => {
    return {
        success: true,
        status: 200,
        message: 'SERVICE_IS_LIVE',
        code: 'SUCCESS',
        data: {
            state: 'healthy',
            timestamp: new Date().toISOString(),
            uptime_seconds: Math.round(process.uptime())
        },
        errors: []
    };
};

/**
 * Readiness probe: can the service actually serve traffic? Returns 503
 * when the database is unreachable so a load balancer drains this instance.
 */
export const readReadinessService = async (): Promise<StandardResponseInterface<ReadinessResponse>> => {
    const database = await readHealthDAO.checkDatabase();
    const isReady = database.status === 'connected';

    const data: ReadinessResponse = {
        state: isReady ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        database
    };

    if (isReady) {
        return {
            success: true,
            status: 200,
            message: 'SERVICE_IS_READY',
            code: 'SUCCESS',
            data,
            errors: []
        };
    }

    healthLogger.warn('Readiness probe failed - database unavailable', {
        action: 'READ_READINESS',
        database
    });

    const status = 503;
    return {
        success: false,
        status,
        message: 'SERVICE_UNAVAILABLE',
        code: getErrorStatus(status),
        data,
        errors: [{ field: 'database', message: database.error ?? 'Database is not reachable' }]
    };
};
