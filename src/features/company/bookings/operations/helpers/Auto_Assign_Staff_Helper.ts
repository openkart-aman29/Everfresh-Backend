// src/features/company/bookings/operations/helpers/Auto_Assign_Staff_Helper.ts

import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { getDatabase } from '@/database/Database_Connection_Manager';

interface StaffAssignmentResult {
    staff_id: string | null;
    assigned: boolean;
    reason?: string;
}

/**
 * Automatically assign available staff to a booking
 * Considers 40-minute transition gap between bookings
 * 
 * @param company_id - Company ID
 * @param service_id - Service ID (to match staff skills if needed)
 * @param scheduled_date - Booking date
 * @param scheduled_time_start - Start time
 * @param scheduled_time_end - End time (optional)
 * @param exclude_booking_id - Exclude this booking (for updates)
 * @returns Staff ID or null if none available
 */
export async function autoAssignStaff(
    company_id: string,
    service_id: string,
    scheduled_date: Date,
    scheduled_time_start: string,
    scheduled_time_end: string | null,
    exclude_booking_id?: string
): Promise<StaffAssignmentResult> {
    try {
        const pool = getDatabase();
        if (!pool) {
            bookingLogger.error('Database pool not available for staff assignment');
            return { staff_id: null, assigned: false, reason: 'DB_POOL_ERROR' };
        }

        // If no end time provided, use start time + 2 hours as default
        const endTime = scheduled_time_end || addMinutesToTime(scheduled_time_start, 120);

        bookingLogger.info('Starting auto staff assignment', {
            company_id,
            scheduled_date,
            time_slot: `${scheduled_time_start} - ${endTime}`
        });

        // ========== QUERY: Find Available Staff ==========
        const query = `
            WITH booking_time_range AS (
                -- Convert scheduled time to timestamp for calculations
                SELECT 
                    $1::DATE AS booking_date,
                    $2::TIME AS start_time,
                    $3::TIME AS end_time,
                    -- Add 40-minute buffer before and after
                    ($2::TIME - INTERVAL '40 minutes')::TIME AS buffer_start,
                    ($3::TIME + INTERVAL '40 minutes')::TIME AS buffer_end
            ),
            available_staff AS (
                SELECT DISTINCT
                    s.staff_id,
                    s.user_id,
                    u.first_name,
                    u.last_name,
                    -- Count current bookings for load balancing
                    COUNT(b.booking_id) FILTER (
                        WHERE b.scheduled_date = $1::DATE
                        AND b.status NOT IN ('cancelled', 'completed')
                    ) AS bookings_today,
                    -- Check for any conflicts
                    BOOL_OR(
                        b.booking_id IS NOT NULL 
                        AND b.status NOT IN ('cancelled', 'completed')
                        AND (
                            -- Direct overlap
                            (b.scheduled_time_start, COALESCE(b.scheduled_time_end, b.scheduled_time_start)) 
                            OVERLAPS 
                            ((SELECT start_time FROM booking_time_range), (SELECT end_time FROM booking_time_range))
                            OR
                            -- Check 40-min buffer before
                            (b.scheduled_time_start, COALESCE(b.scheduled_time_end, b.scheduled_time_start)) 
                            OVERLAPS 
                            ((SELECT buffer_start FROM booking_time_range), (SELECT start_time FROM booking_time_range))
                            OR
                            -- Check 40-min buffer after
                            (b.scheduled_time_start, COALESCE(b.scheduled_time_end, b.scheduled_time_start)) 
                            OVERLAPS 
                            ((SELECT end_time FROM booking_time_range), (SELECT buffer_end FROM booking_time_range))
                        )
                    ) AS has_conflict
                FROM staff s
                JOIN users u ON s.user_id = u.user_id
                LEFT JOIN bookings b ON s.staff_id = b.staff_id
                    AND b.scheduled_date = $1::DATE
                    AND b.deleted_at IS NULL
                    AND b.booking_id != COALESCE($4, '')
                WHERE s.company_id = $5
                    AND s.is_available = TRUE
                    AND s.deleted_at IS NULL
                    AND u.is_active = TRUE
                    AND u.deleted_at IS NULL
                GROUP BY s.staff_id, s.user_id, u.first_name, u.last_name
            )
            SELECT 
                staff_id,
                first_name,
                last_name,
                bookings_today
            FROM available_staff
            WHERE has_conflict = FALSE
            ORDER BY 
                bookings_today ASC,  -- Prefer staff with fewer bookings (load balancing)
                staff_id ASC         -- Consistent tiebreaker
            LIMIT 1
        `;

        const values = [
            scheduled_date,
            scheduled_time_start,
            endTime,
            exclude_booking_id || null,
            company_id
        ];

        const result = await pool.query(query, values);

        // ========== NO STAFF AVAILABLE ==========
        if (result.rows.length === 0) {
            bookingLogger.warn('No staff available for auto-assignment', {
                company_id,
                scheduled_date,
                time_slot: `${scheduled_time_start} - ${endTime}`
            });

            return {
                staff_id: null,
                assigned: false,
                reason: 'NO_STAFF_AVAILABLE'
            };
        }

        // ========== STAFF FOUND ==========
        const assignedStaff = result.rows[0];
        
        bookingLogger.info('Staff auto-assigned successfully', {
            staff_id: assignedStaff.staff_id,
            staff_name: `${assignedStaff.first_name} ${assignedStaff.last_name}`,
            bookings_today: assignedStaff.bookings_today,
            scheduled_date,
            time_slot: `${scheduled_time_start} - ${endTime}`
        });

        return {
            staff_id: assignedStaff.staff_id,
            assigned: true,
            reason: 'AUTO_ASSIGNED'
        };

    } catch (error) {
        bookingLogger.error('Error in auto staff assignment', error);
        return {
            staff_id: null,
            assigned: false,
            reason: 'ASSIGNMENT_ERROR'
        };
    }
}

/**
 * Helper: Add minutes to a time string (HH:MM:SS format)
 */
function addMinutesToTime(timeStr: string, minutes: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}:00`;
}