// src/features/bookings/operations/update_status/controller/Update_Status_Controller.ts
import { Request, Response } from 'express';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { updateStatusZodSchema } from '@/features/company/bookings/operations/update_status/zod_schema/Update_Status_Zod_Schema';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { updateStatusService } from '@/features/company/bookings/operations/update_status/service/Update_Status_Service';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';

/**
 * Controller: Update booking status
 * Route: PATCH /api/bookings/update-status/:booking_id
 * Auth: Required
 */
export const updateStatusController = async (req: Request, res: Response) => {
    try {
        bookingLogger.info('Updating booking status - controller', {
            booking_id: req.params.booking_id,
            user_id: req.user?.user_id
        });
        
        // Validate booking_id
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
        
        // Validate request body
        const validationResult = updateStatusZodSchema.safeParse(req.body);
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
        
        const bookingId = bookingIdValidation.data;
        const companyId = req.user!.company_id;
        const updatedBy = req.user!.user_id;
        
        // Call service
        const serviceResponse = await updateStatusService(
            bookingId,
            companyId,
            updatedBy,
            validationResult.data
        );
        
        bookingLogger.info('Update status completed', {
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
