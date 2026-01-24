// src/features/bookings/operations/read_all/controller/Read_All_Bookings_Controller.ts
import { Request, Response } from 'express';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { readAllBookingsZodSchema } from '@/features/company/bookings/operations/read_all/zod_schema/Read_All_Bookings_Zod_Schema';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAllBookingsService } from '@/features/company/bookings/operations/read_all/service/Read_All_Bookings_Service';

/**
 * Controller: List all bookings with filters and pagination
 * Route: GET /api/bookings/read-all
 * Auth: Required
 */
export const readAllBookingsController = async (req: Request, res: Response) => {
    try {
        bookingLogger.info('Listing bookings - controller', {
            query: req.query,
            user_id: req.user?.user_id
        });
        
        // Validate query parameters
        const validationResult = readAllBookingsZodSchema.safeParse(req.query);
        
        if (!validationResult.success) {
            const validationErrors = validationResult.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message,
            }));
            
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: validationErrors
            };
            
            return sendResponse(res, response);
        }
        
        const filters = {
            ...validationResult.data,
            company_id: req.user!.company_id
        };
        
        // Call service
        const serviceResponse = await readAllBookingsService(filters);
        
        bookingLogger.info('List bookings completed', {
            success: serviceResponse.success,
            total: serviceResponse.data?.total
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
