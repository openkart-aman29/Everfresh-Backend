// src/features/bookings/operations/update/dao/Update_Booking_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

interface UpdateData {
    scheduled_date?: Date;
    scheduled_time_start?: string;
    scheduled_time_end?: string | null;
    service_location?: string;
    staff_id?: string | null;
    special_instructions?: string | null;
}

/**
 * DAO: Update booking record
 */
class UpdateBookingDAO extends BaseBookingDAO {
    async updateBooking(
        bookingId: string,
        companyId: string,
        updateData: UpdateData
    ): Promise<{ success: boolean; booking?: BookingInterface | null }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }
            
            // Build dynamic SET clause
            const setClauses: string[] = ['updated_at = CURRENT_TIMESTAMP'];
            const values: any[] = [];
            let paramIndex = 1;
            
            if (updateData.scheduled_date !== undefined) {
                setClauses.push(`scheduled_date = $${paramIndex}`);
                values.push(updateData.scheduled_date);
                paramIndex++;
            }
            
            if (updateData.scheduled_time_start !== undefined) {
                setClauses.push(`scheduled_time_start = $${paramIndex}`);
                values.push(updateData.scheduled_time_start);
                paramIndex++;
            }
            
            if (updateData.scheduled_time_end !== undefined) {
                setClauses.push(`scheduled_time_end = $${paramIndex}`);
                values.push(updateData.scheduled_time_end);
                paramIndex++;
            }
            
            if (updateData.service_location !== undefined) {
                setClauses.push(`service_location = $${paramIndex}`);
                values.push(updateData.service_location);
                paramIndex++;
            }
            
            if (updateData.staff_id !== undefined) {
                setClauses.push(`staff_id = $${paramIndex}`);
                values.push(updateData.staff_id);
                paramIndex++;
            }
            
            if (updateData.special_instructions !== undefined) {
                setClauses.push(`special_instructions = $${paramIndex}`);
                values.push(updateData.special_instructions);
                paramIndex++;
            }
            
            // Add WHERE conditions
            values.push(bookingId, companyId);
            
            const query = `
                UPDATE bookings
                SET ${setClauses.join(', ')}
                WHERE booking_id = $${paramIndex}
                  AND company_id = $${paramIndex + 1}
                  AND deleted_at IS NULL
                RETURNING *
            `;
            
            const result = await pool.query(query, values);
            
            if (result.rows.length === 0) {
                return { success: true, booking: null };
            }
            
            return {
                success: true,
                booking: result.rows[0] as BookingInterface
            };
            
        } catch (error) {
            this.logError('updateBooking', error);
            return { success: false };
        }
    }
}

export async function updateBookingDAO(
    bookingId: string,
    companyId: string,
    updateData: UpdateData
): Promise<{ success: boolean; booking?: BookingInterface | null }> {
    const dao = new UpdateBookingDAO();
    return dao.updateBooking(bookingId, companyId, updateData);
}
