// src/features/bookings/operations/assign_staff/dao/Assign_Staff_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

/**
 * DAO: Assign staff to booking
 */
class AssignStaffDAO extends BaseBookingDAO {
    async assignStaff(
        bookingId: string,
        companyId: string,
        staffId: string
    ): Promise<{ success: boolean; booking?: BookingInterface | null }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }
            
            const query = `
                UPDATE bookings
                SET staff_id = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE booking_id = $2
                  AND company_id = $3
                  AND deleted_at IS NULL
                RETURNING *
            `;
            
            const values = [staffId, bookingId, companyId];
            
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                return { success: true, booking: null };
            }
            
            return {
                success: true,
                booking: result.rows[0] as BookingInterface
            };
            
        } catch (error) {
            this.logError('assignStaff', error);
            return { success: false };
        }
    }
}

export async function assignStaffDAO(
    bookingId: string,
    companyId: string,
    staffId: string
): Promise<{ success: boolean; booking?: BookingInterface | null }> {
    const dao = new AssignStaffDAO();
    return dao.assignStaff(bookingId, companyId, staffId);
}
