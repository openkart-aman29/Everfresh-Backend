// src/features/bookings/logger/Booking_Logger.ts
import { createFeatureLogger } from '@/utilities/logger/manager/Logger_Manager';

/**
 * Feature-scoped logger for booking operations
 * Creates daily rotating log files in logs/YYYY-MM-DD/bookings/
 */
export const bookingLogger = createFeatureLogger('bookings');

// Usage example:
// bookingLogger.info('Message', { context });
// bookingLogger.error('Error message', error);
// bookingLogger.warn('Warning message');
// bookingLogger.debug('Debug info');
