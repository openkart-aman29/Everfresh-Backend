import 'dotenv/config';
import app from '@/App';
import { ENV } from '@/configurations/ENV_Configuration';
import { connectDatabase } from '@/database/Database_Connection_Manager';
import { tokenCleanupScheduler } from '@/modules/auth/scheduler/Token_Cleanup_Scheduler';
import { createFeatureLogger } from '@/utilities/logger/manager/Logger_Manager';

const serverLogger = createFeatureLogger('Server');

const startServer = async () => {
    try {
        // Connect to database
        const dbConnected = await connectDatabase();
        if (!dbConnected) {
            serverLogger.error('Failed to connect to database');
            process.exit(1);
        }

        // Start token cleanup scheduler
        tokenCleanupScheduler.start();

        const PORT = ENV.PORT;

        app.listen(PORT, () => {
            serverLogger.info(`EverFresh Backend Server running on port ${PORT}`);
        });
    } catch (error) {
        serverLogger.error('Failed to start server', error);
        process.exit(1);
    }
};

// Graceful shutdown
process.on('SIGINT', () => {
    serverLogger.info('Received SIGINT, shutting down gracefully');
    tokenCleanupScheduler.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    serverLogger.info('Received SIGTERM, shutting down gracefully');
    tokenCleanupScheduler.stop();
    process.exit(0);
});

startServer();