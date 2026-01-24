// src/features/bookings/operations/helpers/Check_Staff_Availability_Helper.ts
import { getDatabase } from '@/database/Database_Connection_Manager';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';

/**
 * Helper: Check if staff is available for given time slot
 * @param staffId - Staff ULID
 * @param date - Scheduled date
 * @param startTime - Start time (HH:MM format)
 * @param endTime - End time (HH:MM format)
 * @param excludeBookingId - Booking ID to exclude (for updates)
 * @returns true if staff is available, false otherwise
 */
export async function checkStaffAvailability(
    staffId: string,
    date: Date,
    startTime: string,
    endTime: string,
    excludeBookingId?: string
): Promise<boolean> {
    try {
        const pool = getDatabase();
        if (!pool) {
            bookingLogger.error('Database pool not available');
            return false;
        }
        
        // Query to check for conflicting bookings
        const query = `
            SELECT COUNT(*) AS conflict_count
            FROM bookings
            WHERE staff_id = $1
              AND scheduled_date = $2
              AND status NOT IN ('cancelled', 'completed')
              AND deleted_at IS NULL
              AND booking_id != COALESCE($3, '')
              AND (
                  (scheduled_time_start, COALESCE(scheduled_time_end, scheduled_time_start)) 
                  OVERLAPS 
                  ($4::TIME, $5::TIME)
              )
        `;
        
        const values = [
            staffId,
            date,
            excludeBookingId || '',
            startTime,
            endTime
        ];
        
        const result = await pool.query(query, values);
        const conflictCount = parseInt(result.rows[0].conflict_count);
        
        const isAvailable = conflictCount === 0;
        
        bookingLogger.info('Staff availability check', {
            staff_id: staffId,
            date,
            start_time: startTime,
            end_time: endTime,
            is_available: isAvailable,
            conflicts: conflictCount
        });
        
        return isAvailable;
        
    } catch (error) {
        bookingLogger.error('Error checking staff availability', error);
        return false;
    }
}
