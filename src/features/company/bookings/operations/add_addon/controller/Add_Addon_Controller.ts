/**
 * Add Addon Controller
 */

import { Request, Response } from 'express';
import { Pool } from 'pg';
import { AddAddonService } from '@/features/company/bookings/operations/add_addon/service/Add_Addon_Service';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';

export class AddAddonController {
  private addAddonService: AddAddonService;

  constructor(pool: Pool) {
    this.addAddonService = new AddAddonService(pool);
  }

  /**
   * Add addon endpoint
   */
  async addAddon(req: Request, res: Response): Promise<void> {
    try {
      const { booking_id } = req.params;
      const { addon_id, addon_name, price } = req.body;

      if (!addon_id || !addon_name || !price) {
        res.status(400).json({
          status: 'error',
          code: 400,
          message: 'addon_id, addon_name, and price are required',
        });
        return;
      }

      bookingLogger.info('Add addon request received', { booking_id, addon_id });

      const result = await this.addAddonService.addAddon(
        booking_id,
        addon_id,
        addon_name,
        price
      );

      res.status(201).json({
        status: 'success',
        code: 201,
        message: 'Addon added successfully',
        data: result,
      });
    } catch (error: any) {
      bookingLogger.error('Error in add addon controller', {
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
