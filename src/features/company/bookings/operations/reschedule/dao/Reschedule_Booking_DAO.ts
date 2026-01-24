// src/features/bookings/operations/reschedule/dao/Reschedule_Booking_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

interface RescheduleData {
    new_scheduled_date: Date;
    new_scheduled_time_start: string;
    new_scheduled_time_end?: string | null;
}

/**
 * DAO: Reschedule booking
 * Updates scheduled date and time, sets status to 'rescheduled'
 */
class RescheduleBookingDAO extends BaseBookingDAO {
    async rescheduleBooking(
        bookingId: string,
        companyId: string,
        rescheduleData: RescheduleData
    ): Promise<{ success: boolean; booking?: BookingInterface | null }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }
            
            const query = `
                UPDATE bookings
                SET scheduled_date = $1,
                    scheduled_time_start = $2,
                    scheduled_time_end = $3,
                    status = CASE 
                        WHEN status = 'pending' THEN 'pending'
                        WHEN status = 'confirmed' THEN 'rescheduled'
                        ELSE status
                    END,
                    updated_at = CURRENT_TIMESTAMP
                WHERE booking_id = $4
                  AND company_id = $5
                  AND deleted_at IS NULL
                  AND status NOT IN ('cancelled', 'completed')
                RETURNING *
            `;
            
            const values = [
                rescheduleData.new_scheduled_date,
                rescheduleData.new_scheduled_time_start,
                rescheduleData.new_scheduled_time_end,
                bookingId,
                companyId
            ];
            
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                this.logError('rescheduleBooking', 'No rows updated');
                return { success: true, booking: null };
            }
            
            return {
                success: true,
                booking: result.rows[0] as BookingInterface
            };
            
        } catch (error) {
            this.logError('rescheduleBooking', error);
            return { success: false };
        }
    }
}

export async function rescheduleBookingDAO(
    bookingId: string,
    companyId: string,
    rescheduleData: RescheduleData
): Promise<{ success: boolean; booking?: BookingInterface | null }> {
    const dao = new RescheduleBookingDAO();
    return dao.rescheduleBooking(bookingId, companyId, rescheduleData);
}
