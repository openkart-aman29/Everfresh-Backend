// src/features/bookings/operations/create/controller/Create_Booking_Controller.ts
import { Request, Response } from 'express';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { createBookingZodSchema } from '@/features/company/bookings/operations/create/zod_schema/Create_Booking_Zod_Schema';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { createBookingService } from '@/features/company/bookings/operations/create/service/Create_Booking_Service';
import { ZodError } from 'zod';

/**
 * Controller: Create new booking
 * Route: POST /api/bookings/create
 * Auth: Required (accessTokenVerificationMiddleware)
 */
export const createBookingController = async (req: Request, res: Response) => {
    try {
        bookingLogger.info('Creating booking - controller', {
            user_id: req.user?.user_id,
            company_id: req.body.company_id
        });
        
        const body = req.body;
        
        // Validate request body with Zod
        const validationResult = createBookingZodSchema.safeParse(body);
        
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
            
            bookingLogger.error('Validation failed', { errors: validationErrors });
            return sendResponse(res, response);
        }
        
        // Add created_by from authenticated user
        const bookingData = {
            ...validationResult.data,
            created_by: req.user!.user_id
        };
        
        // Call service layer
        const serviceResponse = await createBookingService(bookingData);
        
        bookingLogger.info('Booking creation completed', {
            success: serviceResponse.success,
            booking_id: serviceResponse.data?.booking_id
        });
        
        return sendResponse(res, serviceResponse);
        
    } catch (error) {
        if (error instanceof ZodError) {
            const validationErrors = error.issues.map(issue => ({
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
            
            bookingLogger.error('Zod validation error', { errors: validationErrors });
            return sendResponse(res, response);
        }
        
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
