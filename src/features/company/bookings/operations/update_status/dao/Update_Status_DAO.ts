// src/features/bookings/operations/update_status/dao/Update_Status_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
import { BookingInterface } from '@/features/company/bookings/interface/Booking_Interface';

interface UpdateStatusData {
    status: string;
    actual_start_time?: Date;
    actual_end_time?: Date;
}

/**
 * DAO: Update booking status
 */
class UpdateStatusDAO extends BaseBookingDAO {
    async updateStatus(
        bookingId: string,
        companyId: string,
        statusData: UpdateStatusData
    ): Promise<{ success: boolean; booking?: BookingInterface | null }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }
            
            // Build dynamic SET clause
            const setClauses: string[] = [
                'status = $1',
                'updated_at = CURRENT_TIMESTAMP'
            ];
            const values: any[] = [statusData.status];
            let paramIndex = 2;
            
            if (statusData.actual_start_time !== undefined) {
                setClauses.push(`actual_start_time = $${paramIndex}`);
                values.push(statusData.actual_start_time);
                paramIndex++;
            }
            
            if (statusData.actual_end_time !== undefined) {
                setClauses.push(`actual_end_time = $${paramIndex}`);
                values.push(statusData.actual_end_time);
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
            this.logError('updateStatus', error);
            return { success: false };
        }
    }
}

export async function updateStatusDAO(
    bookingId: string,
    companyId: string,
    statusData: UpdateStatusData
): Promise<{ success: boolean; booking?: BookingInterface | null }> {
    const dao = new UpdateStatusDAO();
    return dao.updateStatus(bookingId, companyId, statusData);
}
