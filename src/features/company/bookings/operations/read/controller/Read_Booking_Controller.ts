// src/features/bookings/operations/read/controller/Read_Booking_Controller.ts
import { Request, Response } from 'express';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readBookingService } from '@/features/company/bookings/operations/read/service/Read_Booking_Service';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';

/**
 * Controller: Get single booking by ID
 * Route: GET /api/bookings/read/:booking_id
 * Auth: Required
 */
export const readBookingController = async (req: Request, res: Response) => {
    try {
        bookingLogger.info('Reading booking - controller', {
            booking_id: req.params.booking_id,
            user_id: req.user?.user_id
        });
        
        // Validate booking_id parameter
        const bookingIdValidation = ulidZodSchema.safeParse(req.params.booking_id);
        
        if (!bookingIdValidation.success) {
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'INVALID_BOOKING_ID',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'booking_id', message: 'Invalid booking ID format' }]
            };
            
            return sendResponse(res, response);
        }
        
        const bookingId = bookingIdValidation.data;
        const companyId = req.user!.company_id;
        
        // Call service
        const serviceResponse = await readBookingService(bookingId, companyId);
        
        bookingLogger.info('Read booking completed', {
            success: serviceResponse.success,
            booking_id: bookingId
        });
        
        return sendResponse(res, serviceResponse);
        
    } catch (error) {
        const status = 500;
        const response: StandardResponseInterface<null> = {
            success: false,
            message: 'INTERNAL_SERVER_ERROR',
            status,
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'SERVER_ERROR', message: 'Internal server error' }],
        };
        
        bookingLogger.error('Controller error', error);
        return sendResponse(res, response);
    }
};
