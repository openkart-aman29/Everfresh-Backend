// src/features/bookings/operations/cancel/dao/Cancel_Booking_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

/**
 * DAO: Cancel booking
 * Updates status to 'cancelled' and records cancellation details
 */
class CancelBookingDAO extends BaseBookingDAO {
    async cancelBooking(
        bookingId: string,
        companyId: string,
        cancelledBy: string,
        cancellationReason: string
    ): Promise<{ success: boolean; booking?: BookingInterface | null }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }
            
            const query = `
                UPDATE bookings
                SET status = 'cancelled',
                    cancellation_reason = $1,
                    cancelled_by = $2,
                    cancelled_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE booking_id = $3
                  AND company_id = $4
                  AND deleted_at IS NULL
                  AND status NOT IN ('cancelled', 'completed')
                RETURNING *
            `;
            
            const values = [
                cancellationReason,
                cancelledBy,
                bookingId,
                companyId
            ];
            
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                this.logError('cancelBooking', 'No rows updated - booking may not exist or already cancelled');
                return { success: true, booking: null };
            }
            
            return {
                success: true,
                booking: result.rows[0] as BookingInterface
            };
            
        } catch (error) {
            this.logError('cancelBooking', error);
            return { success: false };
        }
    }
}

export async function cancelBookingDAO(
    bookingId: string,
    companyId: string,
    cancelledBy: string,
    cancellationReason: string
): Promise<{ success: boolean; booking?: BookingInterface | null }> {
    const dao = new CancelBookingDAO();
    return dao.cancelBooking(bookingId, companyId, cancelledBy, cancellationReason);
}
