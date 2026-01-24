// src/features/bookings/operations/create/dao/Create_Booking_Addons_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
import { generateULID } from '@/utilities/id_generator/ULID_Generator';

/**
 * DAO: Create booking addons record
 */
class CreateBookingAddonsDAO extends BaseBookingDAO {
    async createAddons(
        bookingId: string,
        addons: any[]
    ): Promise<{ success: boolean }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }

            for (const addon of addons) {
                const query = `
                    INSERT INTO booking_addons (
                        booking_addon_id,
                        booking_id,
                        addon_id,
                        addon_name,
                        price,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                `;

                const values = [
                    generateULID(),
                    bookingId,
                    addon.addon_id,
                    addon.addon_name,
                    addon.price,
                    new Date()
                ];

                await pool.query(query, values);
            }

            return { success: true };
        } catch (error) {
            this.logError('createAddons', error);
            return { success: false };
        }
    }
}

/**
 * Export DAO function
 */
export async function createBookingAddonsDAO(
    bookingId: string,
    addons: any[]
): Promise<{ success: boolean }> {
    const dao = new CreateBookingAddonsDAO();
    return dao.createAddons(bookingId, addons);
}
