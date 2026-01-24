// src/features/bookings/operations/add_addon/dao/Add_Addon_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { ulid } from 'ulid';

/**
 * DAO: Add addon to booking
 */
export class AddAddonDAO extends BaseBookingDAO {
    async addAddon(
        bookingId: string,
        addons: Array<{ addon_id: string; addon_name: string; price: number }>
    ): Promise<{ success: boolean }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }
            
            // Insert each addon
            for (const addon of addons) {
                const query = `
                    INSERT INTO booking_addons (
                        booking_addon_id,
                        booking_id,
                        addon_id,
                        addon_name,
                        price,
                        created_at
                    ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                `;
                
                const values = [
                    ulid(),
                    bookingId,
                    addon.addon_id,
                    addon.addon_name,
                    addon.price
                ];
                
                await pool.query(query, values);
            }
            
            return { success: true };
            
        } catch (error) {
            this.logError('addAddon', error);
            return { success: false };
        }
    }
}

export async function addAddonDAO(
    bookingId: string,
    addons: Array<{ addon_id: string; addon_name: string; price: number }>
): Promise<{ success: boolean }> {
    const dao = new AddAddonDAO();
    return dao.addAddon(bookingId, addons);
}
