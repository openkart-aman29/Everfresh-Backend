/**
 * Delete Booking Controller
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { DeleteBookingService } from '@/features/company/bookings/operations/delete/service/Delete_Booking_Service';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';

export class DeleteBookingController {
  private deleteBookingService: DeleteBookingService;

  constructor(pool: Pool) {
    this.deleteBookingService = new DeleteBookingService(pool);
  }

  /**
   * Delete booking endpoint
   */
  async deleteBooking(req: Request, res: Response): Promise<void> {
    try {
      const { booking_id } = req.params;
      const company_id = (req as any).user?.company_id;

      if (!booking_id) {
        res.status(400).json({
          status: 'error',
          code: 400,
          message: 'Booking ID is required',
        });
        return;
      }

      bookingLogger.info('Delete booking request received', { booking_id });

      await this.deleteBookingService.deleteBooking(booking_id, company_id);

      res.status(200).json({
        status: 'success',
        code: 200,
        message: 'Booking deleted successfully',
      });
    } catch (error: any) {
      bookingLogger.error('Error in delete booking controller', {
        error: error.message,
      });

      res.status(error.statusCode || 500).json({
        status: 'error',
        code: error.statusCode || 500,
        message: error.message || 'Internal server error',
      });
    }
  }
}
