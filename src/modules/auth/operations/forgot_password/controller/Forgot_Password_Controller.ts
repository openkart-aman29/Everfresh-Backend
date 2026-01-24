import { Request, Response } from 'express';
import { z } from 'zod';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { forgotPasswordZodSchema } from '@/modules/auth/operations/forgot_password/zod_schema/Forgot_Password_Zod_Schema';
import { forgotPasswordService } from '@/modules/auth/operations/forgot_password/service/Forgot_Password_Service';

export interface ForgotPasswordRequestInterface {
    email: string; 
}

/**
 * Forgot Password Controller
 * Handles HTTP request/response for password reset initiation
 */
export const forgotPasswordController = async (
    req: Request,
    res: Response
): Promise<Response> => {
    try {
        authLogger.info('Starting forgot password request @ forgotPasswordController');

        const body = req.body;
        
        authLogger.info('Received forgot password request @ forgotPasswordController', {
            email: body.email ? 
                body.email.substring(0, 3) + '***' : 'undefined'
        });

        const requestBody: ForgotPasswordRequestInterface = {
            email: body.email
        };
        
        const parsedRequest = forgotPasswordZodSchema.parse(requestBody);
        
        authLogger.info('Request validation successful @ forgotPasswordController');
        
        const deviceInfo = req.headers['user-agent'];
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() 
            || req.socket.remoteAddress 
            || 'unknown';

        authLogger.info('Request metadata extracted @ forgotPasswordController', {
            deviceInfo: deviceInfo?.substring(0, 50) + '...',
            ipAddress
        });
        
        const serviceResponse: StandardResponseInterface<null> = await forgotPasswordService({
                email: parsedRequest.email,
                deviceInfo,
                ipAddress
            });

        authLogger.info('Service response received @ forgotPasswordController', {
            success: serviceResponse.success,
            message: serviceResponse.message
        });

        const controllerResponse: StandardResponseInterface<null> = {
            success: serviceResponse.success,
            message: serviceResponse.message,
            status: serviceResponse.status,
            code: serviceResponse.code,
            data: serviceResponse.data,
            errors: serviceResponse.errors
        };

        authLogger.info('Sending controller response @ forgotPasswordController', {
            success: controllerResponse.success,
            status: controllerResponse.status,
            message: controllerResponse.message
        });

        return sendResponse(res, controllerResponse);

    } catch (error) {
        
        if (error instanceof z.ZodError) {
            const validationErrors = error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message
            }));

            const status = 400;
            const validationResponse: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: validationErrors
            };

            authLogger.error('Validation error @ forgotPasswordController', {
                errors: validationErrors
            });

            return sendResponse(res, validationResponse);
        }
        authLogger.error('CRITICAL ERROR @ forgotPasswordController', error);

        const status = 500;
        const errorResponse: StandardResponseInterface<null> = {
            success: false,
            message: 'INTERNAL_SERVER_ERROR',
            status,
            code: getErrorStatus(status),
            data: null,
            errors: [
                {
                    field: 'server',
                    message: 'Failed to process forgot password request due to internal error'
                }
            ]
        };

        return sendResponse(res, errorResponse);
    }
};
