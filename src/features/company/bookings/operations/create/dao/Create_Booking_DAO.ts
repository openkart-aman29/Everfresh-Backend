// src/features/bookings/operations/create/dao/Create_Booking_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

/**
 * DAO: Create new booking record
 */
class CreateBookingDAO extends BaseBookingDAO {
    async createBooking(
        bookingData: BookingInterface
    ): Promise<{ success: boolean; booking?: BookingInterface | null }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }
            
            const query = `
                INSERT INTO bookings (
                    booking_id,
                    company_id,
                    customer_id,
                    service_id,
                    staff_id,
                    status,
                    scheduled_date,
                    scheduled_time_start,
                    scheduled_time_end,
                    service_location,
                    quantity,
                    service_price,
                    addons_total,
                    subtotal,
                    discount_amount,
                    tax_amount,
                    total_amount,
                    special_instructions,
                    created_by,
                    created_at,
                    updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                    $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
                )
                RETURNING *
            `;
            
            const values = [
                bookingData.booking_id,
                bookingData.company_id,
                bookingData.customer_id,
                bookingData.service_id,
                bookingData.staff_id,
                bookingData.status,
                bookingData.scheduled_date,
                bookingData.scheduled_time_start,
                bookingData.scheduled_time_end,
                bookingData.service_location,
                bookingData.quantity,
                bookingData.service_price,
                bookingData.addons_total,
                bookingData.subtotal,
                bookingData.discount_amount,
                bookingData.tax_amount,
                bookingData.total_amount,
                bookingData.special_instructions,
                bookingData.created_by,
                bookingData.created_at,
                bookingData.updated_at
            ];
            
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                this.logError('createBooking', 'No rows returned after insert');
                return { success: false };
            }
            
            return {
                success: true,
                booking: result.rows[0] as BookingInterface
            };
            
        } catch (error) {
            this.logError('createBooking', error);
            return { success: false };
        }
    }
}

/**
 * Export DAO function
 */
export async function createBookingDAO(
    bookingData: BookingInterface
): Promise<{ success: boolean; booking?: BookingInterface | null }> {
    const dao = new CreateBookingDAO();
    return dao.createBooking(bookingData);
}
