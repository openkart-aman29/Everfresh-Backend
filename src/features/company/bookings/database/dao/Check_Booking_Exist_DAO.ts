// src/features/bookings/database/dao/Check_Booking_Exist_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';

/**
 * DAO for checking booking existence
 */
class CheckBookingExistDAO extends BaseBookingDAO {
    /**
     * Check if booking exists by booking_id
     * @param bookingId - Booking ULID
     * @param companyId - Company ULID (for multi-tenant isolation)
     * @returns Object with exists flag
     */
    async checkById(
        bookingId: string,
        companyId: string
    ): Promise<{ exists: boolean }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { exists: false };
            }

            const query = `
                SELECT EXISTS(
                    SELECT 1 
                    FROM bookings 
                    WHERE booking_id = $1 
                      AND company_id = $2 
                      AND deleted_at IS NULL
                ) AS exists
            `;

            const result = await pool.query(query, [bookingId, companyId]);

            return {
                exists: result.rows[0]?.exists || false
            };

        } catch (error) {
            this.logError('checkById', error);
            return { exists: false };
        }
    }

    /**
     * Check if booking exists by booking_number
     * @param bookingNumber - Booking number (e.g., EVERFRESH-BK-20250108-0001)
     * @param companyId - Company ULID
     * @returns Object with exists flag
     */
    async checkByNumber(
        bookingNumber: string,
        companyId: string
    ): Promise<{ exists: boolean }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { exists: false };
            }

            const query = `
                SELECT EXISTS(
                    SELECT 1 
                    FROM bookings 
                    WHERE booking_number = $1 
                      AND company_id = $2 
                      AND deleted_at IS NULL
                ) AS exists
            `;

            const result = await pool.query(query, [bookingNumber, companyId]);

            return {
                exists: result.rows[0]?.exists || false
            };

        } catch (error) {
            this.logError('checkByNumber', error);
            return { exists: false };
        }
    }
}

// Export singleton functions
const dao = new CheckBookingExistDAO();

export async function checkBookingExistByIdDAO(
    bookingId: string,
    companyId: string
): Promise<{ exists: boolean }> {
    return dao.checkById(bookingId, companyId);
}

export async function checkBookingExistByNumberDAO(
    bookingNumber: string,
    companyId: string
): Promise<{ exists: boolean }> {
    return dao.checkByNumber(bookingNumber, companyId);
}
