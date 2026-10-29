import { Request, Response } from 'express';
import { enquiryLogger } from '@/features/enquiries/logger/Enquiry_Logger';
import { createEnquiryService } from '@/features/enquiries/operations/create/service/Create_Enquiry_Service';
import { createEnquiryZodSchema } from '@/features/enquiries/zod_schema/Enquiry_Zod_Schema';
import { EnquiryRequestContext } from '@/features/enquiries/interfaces/Enquiry.interface';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';

/**
 * Public endpoint - no authenticated user is present, so nothing here may read
 * req.user, and the tenant is resolved in the service from configuration.
 */
export const createEnquiryController = async (req: Request, res: Response) => {
    try {
        enquiryLogger.info('Create enquiry - controller', { action: 'CREATE_ENQUIRY' });

        const validation = createEnquiryZodSchema.safeParse(req.body);

        if (!validation.success) {
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: validation.error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                })),
            };
            enquiryLogger.warn('Enquiry validation failed', { errors: response.errors });
            return sendResponse(res, response);
        }

        // Captured server-side; a client must not be able to spoof these.
        const forwardedFor = req.headers['x-forwarded-for'];
        const context: EnquiryRequestContext = {
            ip_address:
                (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(',')[0]?.trim() ??
                req.socket.remoteAddress ??
                null,
            user_agent: (req.headers['user-agent'] ?? '').slice(0, 500) || null,
        };

        const serviceResponse = await createEnquiryService(validation.data, context);

        return sendResponse(res, serviceResponse);
    } catch (error) {
        enquiryLogger.error('Unexpected error in create enquiry controller', {
            action: 'CREATE_ENQUIRY',
            error,
        });

        const status = 500;
        const response: StandardResponseInterface<null> = {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error' }],
        };

        return sendResponse(res, response);
    }
};
