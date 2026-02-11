import { Response, Request } from 'express';
import { createFeatureLogger } from '@/utilities/logger/manager/Logger_Manager';

const sseLogger = createFeatureLogger('SSE_Manager');

interface SSEClient {
    userId: string;
    companyId: string;
    res: Response;
    ip: string;
}

export class SSE_Manager {
    private static instance: SSE_Manager;
    private clients: SSEClient[] = [];
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private readonly HEARTBEAT_MS = 30000; // 30 seconds

    private constructor() {
        this.startHeartbeat();
        this.setupGracefulShutdown();
    }

    public static getInstance(): SSE_Manager {
        if (!SSE_Manager.instance) {
            SSE_Manager.instance = new SSE_Manager();
        }
        return SSE_Manager.instance;
    }

    /**
     * Add a new client connection
     */
    public addClient(req: Request, res: Response, userId: string, companyId: string) {
        // Headers for SSE
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no' // Nginx specific
        });

        // Send creating connection message
        res.write(`data: ${JSON.stringify({ type: 'connection_established', message: 'Connected to SSE server' })}\n\n`);

        const newClient: SSEClient = {
            userId,
            companyId,
            res,
            ip: req.ip || 'unknown'
        };

        this.clients.push(newClient);

        sseLogger.info('SSE Client Connected', {
            userId,
            companyId,
            totalClients: this.clients.length,
            ip: newClient.ip
        });

        // Remove client on close
        req.on('close', () => {
            this.removeClient(userId, res);
        });
    }

    /**
     * Remove a client connection
     */
    private removeClient(userId: string, res: Response) {
        this.clients = this.clients.filter(client => client.res !== res);
        sseLogger.info('SSE Client Disconnected', {
            userId,
            totalClients: this.clients.length
        });
    }

    /**
     * Broadcast an event to filtered clients
     */
    public broadcast(event: string, data: any, targetCompanyId: string) {
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

        // Filter clients by companyId
        const targetClients = this.clients.filter(client => client.companyId === targetCompanyId);

        if (targetClients.length === 0) {
            sseLogger.debug('No clients connected for broadcast', {
                event,
                targetCompanyId
            });
            return;
        }

        targetClients.forEach(client => {
            try {
                client.res.write(payload);
            } catch (error) {
                sseLogger.error('Failed to send to client', {
                    userId: client.userId,
                    error
                });
                this.removeClient(client.userId, client.res);
            }
        });

        sseLogger.info('SSE Broadcast Sent', {
            event,
            targetCompanyId,
            recipients: targetClients.length
        });
    }

    /**
     * Send heartbeat to keep connections alive
     */
    private startHeartbeat() {
        if (this.heartbeatInterval) return;

        this.heartbeatInterval = setInterval(() => {
            if (this.clients.length === 0) return;

            const comment = ': keep-alive\n\n';
            this.clients.forEach(client => {
                try {
                    client.res.write(comment);
                } catch (e) {
                    // removing will happen on 'close' event usually, but just in case
                }
            });
            // sseLogger.debug('Heartbeat sent', { connectedClients: this.clients.length });
        }, this.HEARTBEAT_MS);
    }

    /**
     * Graceful shutdown of all connections
     */
    private setupGracefulShutdown() {
        const cleanup = () => {
            sseLogger.info('Shutting down SSE Manager - closing all connections');
            if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

            this.clients.forEach(client => {
                client.res.write(`event: server_shutdown\ndata: ${JSON.stringify({ message: 'Server shutting down' })}\n\n`);
                client.res.end();
            });
            this.clients = [];
        };

        process.on('SIGTERM', cleanup);
        process.on('SIGINT', cleanup);
    }
}

export const sseManager = SSE_Manager.getInstance();
