/**
 * Delete Booking Service
 */

import { Pool } from 'pg';
import { deleteBookingDAO } from '@/features/company/bookings/operations/delete/dao/Delete_Booking_DAO';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';

export class DeleteBookingService {
  constructor(pool: Pool) {
    // Base DAO uses global pool manager; pool parameter kept for compatibility
  }

  /**
   * Delete booking
   */
  async deleteBooking(booking_id: string, company_id: string): Promise<boolean> {
    try {
      bookingLogger.info('Deleting booking', { booking_id });

      const result = await deleteBookingDAO(booking_id, company_id);

      if (!result || !result.success) {
        throw new Error('Booking not found or could not be deleted');
      }

      return true;
    } catch (error: any) {
      bookingLogger.error('Error deleting booking', {
        booking_id,
        error: error.message,
      });
      throw error;
    }
  }
}
