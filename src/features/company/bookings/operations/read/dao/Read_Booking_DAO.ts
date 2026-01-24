// src/features/bookings/operations/read/dao/Read_Booking_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

/**
 * DAO: Fetch single booking with full details
 */
class ReadBookingDAO extends BaseBookingDAO {
    async readBooking(
        bookingId: string,
        companyId: string
    ): Promise<{ success: boolean; booking?: BookingInterface | null }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }
            
            const query = `
                SELECT 
                    b.*,
                    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
                    cu.email AS customer_email,
                    cu.phone AS customer_phone,
                    s.service_name,
                    s.category AS service_category,
                    s.subcategory AS service_subcategory,
                    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
                    COALESCE(
                        json_agg(
                            DISTINCT jsonb_build_object(
                                'booking_addon_id', ba.booking_addon_id,
                                'addon_id', ba.addon_id,
                                'addon_name', ba.addon_name,
                                'price', ba.price
                            )
                        ) FILTER (WHERE ba.booking_addon_id IS NOT NULL),
                        '[]'
                    ) AS addons
                FROM bookings b
                INNER JOIN customers cust ON b.customer_id = cust.customer_id
                INNER JOIN users cu ON cust.user_id = cu.user_id
                INNER JOIN services s ON b.service_id = s.service_id
                LEFT JOIN staff stf ON b.staff_id = stf.staff_id
                LEFT JOIN users su ON stf.user_id = su.user_id
                LEFT JOIN booking_addons ba ON b.booking_id = ba.booking_id
                WHERE b.booking_id = $1
                  AND b.company_id = $2
                  AND b.deleted_at IS NULL
                GROUP BY 
                    b.booking_id, 
                    cu.first_name, cu.last_name, cu.email, cu.phone,
                    s.service_name, s.category, s.subcategory,
                    su.first_name, su.last_name
            `;
            
            const result = await pool.query(query, [bookingId, companyId]);
            
            if (result.rows.length === 0) {
                return { success: true, booking: null };
            }
            
            return {
                success: true,
                booking: result.rows[0] as BookingInterface
            };
            
        } catch (error) {
            this.logError('readBooking', error);
            return { success: false };
        }
    }
}

export async function readBookingDAO(
    bookingId: string,
    companyId: string
): Promise<{ success: boolean; booking?: BookingInterface | null }> {
    const dao = new ReadBookingDAO();
    return dao.readBooking(bookingId, companyId);
}
