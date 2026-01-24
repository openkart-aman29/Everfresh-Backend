import { Request, Response } from 'express';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { customerSignUpZodSchema } from '@/modules/auth/operations/signup/customer/zod_schema/Customer_SignUp_Zod_Schema';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { customerSignUpService } from '@/modules/auth/operations/signup/customer/service/Customer_SignUp_Service';
import { ZodError } from 'zod';

export const customerSignUpController = async (req: Request, res: Response) => {
    try {
        authLogger.info('Customer signup - controller');

        // Validate request body
        const validationResult = customerSignUpZodSchema.safeParse(req.body);

        if (!validationResult.success) {
            const validationErrors = validationResult.error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
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

            authLogger.error('Validation error', response);
            return sendResponse(res, response);
        }

        // Call service
        const serviceResponse = await customerSignUpService(validationResult.data);

        authLogger.info('Controller response', serviceResponse);
        return sendResponse(res, serviceResponse);

    } catch (error) {
        if (error instanceof ZodError) {
            const validationErrors = error.issues.map(issue => ({
                field: issue.path.join('.'),
                message: issue.message
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

            authLogger.error('Zod error', response);
            return sendResponse(res, response);
        }

        const status = 500;
        const response: StandardResponseInterface<null> = {
            success: false,
            message: 'INTERNAL_SERVER_ERROR',
            status,
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'SERVER_ERROR', message: 'Internal server error' }]
        };

        authLogger.error('Error in controller', response);
        return sendResponse(res, response);
    }
};