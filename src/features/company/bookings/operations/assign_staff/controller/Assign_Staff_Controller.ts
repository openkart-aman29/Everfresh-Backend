// src/features/bookings/operations/assign_staff/controller/Assign_Staff_Controller.ts
import { Request, Response } from 'express';
import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';
import { assignStaffZodSchema } from '@/features/company/bookings/operations/assign_staff/zod_schema/Assign_Staff_Zod_Schema';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { assignStaffService } from '@/features/company/bookings/operations/assign_staff/service/Assign_Staff_Service';
import { ulidZodSchema } from '@/utilities/global_schemas/ULID_Zod_Schema';

/**
 * Controller: Assign staff to booking
 * Route: PATCH /api/bookings/assign-staff/:booking_id
 * Auth: Required (Admin/Manager only)
 */
export const assignStaffController = async (req: Request, res: Response) => {
    try {
        bookingLogger.info('Assigning staff - controller', {
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
        const validationResult = assignStaffZodSchema.safeParse(req.body);
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
        const assignedBy = req.user!.user_id;
        
        // Call service
        const serviceResponse = await assignStaffService(
            bookingId,
            companyId,
            assignedBy,
            validationResult.data
        );
        
        bookingLogger.info('Assign staff completed', {
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
