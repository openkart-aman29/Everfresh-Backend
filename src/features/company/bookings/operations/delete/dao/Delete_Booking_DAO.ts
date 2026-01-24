// src/features/bookings/operations/delete/dao/Delete_Booking_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

/**
 * DAO: Soft delete booking
 */
export class DeleteBookingDAO extends BaseBookingDAO {
    async deleteBooking(
        bookingId: string,
        companyId: string
    ): Promise<{ success: boolean; booking?: BookingInterface | null }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }
            
            const query = `
                UPDATE bookings
                SET deleted_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE booking_id = $1
                  AND company_id = $2
                  AND deleted_at IS NULL
                RETURNING *
            `;
            
            const values = [bookingId, companyId];
            
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                return { success: true, booking: null };
            }
            
            return {
                success: true,
                booking: result.rows[0] as BookingInterface
            };
            
        } catch (error) {
            this.logError('deleteBooking', error);
            return { success: false };
        }
    }
}

export async function deleteBookingDAO(
    bookingId: string,
    companyId: string
): Promise<{ success: boolean; booking?: BookingInterface | null }> {
    const dao = new DeleteBookingDAO();
    return dao.deleteBooking(bookingId, companyId);
}
