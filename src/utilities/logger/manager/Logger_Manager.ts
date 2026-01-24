import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { DateTime } from 'luxon';
import { TIMEZONE, LOG_RETENTION_DAYS, NODE_ENV, LOG_CONSOLE_PRODUCTION } from "@/configurations/ENV_Configuration";

//----------------------------------------------------------------------------------------------------------------------
// Setup basic paths and configuration

const logDir = path.join(process.cwd(), 'logs');

const retentionDays = (() => {
    const days = LOG_RETENTION_DAYS || 30;
    if (isNaN(days) || days <= 0) throw new Error("LOG_RETENTION_DAYS must be a positive integer.");
    return days;
})();

const isProduction = NODE_ENV === 'production';
const timezone = TIMEZONE || 'UTC';

//----------------------------------------------------------------------------------------------------------------------
// Utility functions

const ensureDirectoryExists = (dir: string) => {
    try {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (error) {
        console.error(`Failed to create directory: ${dir}`, error);
    }
};

const getDateBasedLogDir = () => {
    const now = DateTime.now().setZone(timezone);
    const year = now.toFormat('yyyy');
    const month = now.toFormat('MM');
    const day = now.toFormat('dd');
    const dir = path.join(logDir, `${year}-${month}-${day}`);
    ensureDirectoryExists(dir);
    return dir;
};

const getFeatureLogDir = (featureName: string) => {
    const dir = path.join(getDateBasedLogDir(), featureName);
    ensureDirectoryExists(dir);
    return dir;
};

const sanitizeFeatureName = (featureName: string) => {
    return featureName.replace(/[^a-zA-Z0-9-_]/g, '_');
};

const cleanupOldFolders = async (baseDir: string, retentionDays: number) => {
    try {
        const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        const folders = await fs.promises.readdir(baseDir);
        for (const folder of folders) {
            const folderPath = path.join(baseDir, folder);
            const stats = await fs.promises.stat(folderPath);
            if (stats.isDirectory() && stats.mtime.getTime() < cutoffTime) {
                await fs.promises.rm(folderPath, { recursive: true, force: true });
            }
        }
    } catch (error) {
        console.error('Failed to clean up old log folders:', error);
    }
};

//----------------------------------------------------------------------------------------------------------------------
// Shared enhanced format

const enhancedFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...metadata }) => {
        const now = DateTime.fromISO(timestamp as string).setZone(timezone);
        const formattedTimestamp = now.toFormat('yyyy-MM-dd HH:mm:ss');
        const hostname = os.hostname();
        const pid = process.pid;

        let log = `${formattedTimestamp} [${level.toUpperCase()}] [${hostname}] [PID:${pid}]: ${message}`;

        if (Object.keys(metadata).length > 0) {
            log += ` | Meta: ${JSON.stringify(metadata)}`;
        }
        if (stack) {
            log += `\n${stack}`;
        }
        return log;
    })
);

//----------------------------------------------------------------------------------------------------------------------
// Base logger configuration

const createBaseLoggerConfig = (level: string, transports: winston.transport[]) => ({
    level,
    format: enhancedFormat,
    transports,
});

//----------------------------------------------------------------------------------------------------------------------
// Feature-specific logger factory

export const createFeatureLogger = (featureName: string) => {
    const sanitizedFeatureName = sanitizeFeatureName(featureName);
    const featureLogDir = getFeatureLogDir(sanitizedFeatureName);

    // Determine if console should be silent
    // Silent if production AND LOG_CONSOLE_PRODUCTION is explicitly false
    // If LOG_CONSOLE_PRODUCTION is true, we want logs even in production
    const isConsoleSilent = isProduction && LOG_CONSOLE_PRODUCTION !== true;

    return winston.createLogger({
        level: 'info',
        format: enhancedFormat,
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                ),
                silent: isConsoleSilent,
            }),
            new winston.transports.DailyRotateFile({
                filename: `${featureLogDir}/${sanitizedFeatureName}.log`,
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxFiles: `${retentionDays}d`,
                level: 'info'
            }),
            new winston.transports.DailyRotateFile({
                filename: `${featureLogDir}/${sanitizedFeatureName}-error.log`,
                datePattern: 'YYYY-MM-DD',
                zippedArchive: true,
                maxFiles: `${retentionDays}d`,
                level: 'error'
            })
        ],
    });
};


//----------------------------------------------------------------------------------------------------------------------
// Perform log folder cleanup (fire and forget)

(async () => {
    try {
        await cleanupOldFolders(logDir, retentionDays);
    } catch (error) {
        console.error('Error during log folder cleanup:', error);
    }
})();
