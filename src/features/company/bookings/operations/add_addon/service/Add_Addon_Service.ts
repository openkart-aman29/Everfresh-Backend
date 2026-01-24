/**
 * Add Addon Service
 */

import { Pool } from 'pg';
import { addAddonDAO } from '@/features/company/bookings/operations/add_addon/dao/Add_Addon_DAO';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';

export class AddAddonService {
  constructor(pool: Pool) {
    // Base DAO uses global pool manager; pool parameter kept for compatibility
  }

  /**
   * Add addon to booking
   */
  async addAddon(
    booking_id: string,
    addon_id: string,
    addon_name: string,
    price: number
  ): Promise<any> {
    try {
      bookingLogger.info('Adding addon to booking', { booking_id, addon_id });

      const result = await addAddonDAO(booking_id, [{ addon_id, addon_name, price }]);

      return result;
    } catch (error: any) {
      bookingLogger.error('Error adding addon', {
        booking_id,
        addon_id,
        error: error.message,
      });
      throw error;
    }
  }
}
