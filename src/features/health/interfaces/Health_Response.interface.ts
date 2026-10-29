// src/features/health/interfaces/Health_Response.interface.ts

export type HealthState = 'healthy' | 'degraded' | 'unhealthy';

export interface DatabaseHealth {
    status: 'connected' | 'disconnected' | 'error';
    latency_ms: number | null;
    pool: {
        total: number;
        idle: number;
        waiting: number;
    } | null;
    error: string | null;
}

export interface ProcessHealth {
    uptime_seconds: number;
    memory_mb: {
        rss: number;
        heap_used: number;
        heap_total: number;
    };
    node_version: string;
    pid: number;
}

export interface HealthResponse {
    state: HealthState;
    timestamp: string;
    environment: string;
    version: string;
    database: DatabaseHealth;
    process: ProcessHealth;
}

export interface LivenessResponse {
    state: HealthState;
    timestamp: string;
    uptime_seconds: number;
}

export interface ReadinessResponse {
    state: HealthState;
    timestamp: string;
    database: DatabaseHealth;
}
