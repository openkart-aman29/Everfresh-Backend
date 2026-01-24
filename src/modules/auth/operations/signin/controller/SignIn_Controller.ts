import { Request, Response } from 'express';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { signInZodSchema } from '@/modules/auth/operations/signin/zod_schema/SignIn_Zod_Schema';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { signInService } from '@/modules/auth/operations/signin/service/SignIn_Service';
import { COOKIE_DOMAIN, REFRESH_TOKEN_EXPIRATION_TIME } from "@/configurations/ENV_Configuration";
import { SignInResponseInterface } from '@/modules/auth/interface/Auth_Interface';

export const signInController = async (req: Request, res: Response) => {
    try {
        authLogger.info('SignIn controller');

        // Validate request body
        const validationResult = signInZodSchema.safeParse(req.body);

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

            return sendResponse(res, response);
        }

        // Extract device info and IP
        const deviceInfo = req.headers['user-agent'];
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

        // Call service
        const serviceResponse = await signInService(
            validationResult.data,
            deviceInfo,
            ipAddress
        );

          if (serviceResponse.success && serviceResponse.data) {
            const { accessToken, refreshToken, ...user } = serviceResponse.data;

            authLogger.info("Cookie domain @ signInController = ", COOKIE_DOMAIN);

            // Set refresh token as HTTP-Only, Secure, and with SameSite settings
            res.cookie('refreshToken', serviceResponse.data.refreshToken, {
                httpOnly: true,    // Prevent JavaScript access
                secure: true,      // Ensure transmission over HTTPS
                sameSite: 'none', // Protect from CSRF
                maxAge: REFRESH_TOKEN_EXPIRATION_TIME * 1000, // Convert seconds to milliseconds
                path: '/',
                domain: COOKIE_DOMAIN,
                partitioned: true, // Add this new attribute
            });
             const controllerResponse: StandardResponseInterface<Omit<SignInResponseInterface , 'refreshToken'>> = {
                success: true,
                message: serviceResponse.message,
                status: serviceResponse.status,
                code: serviceResponse.code,
                data: { ...user, accessToken }, // Return only access token in response
                errors: serviceResponse.errors,
            };

            authLogger.info("Sending final response @ signInController", controllerResponse);
            return sendResponse(res, controllerResponse);
            
        }
        return sendResponse(res, serviceResponse);

    } catch (error) {
        const status = 500;
        const response: StandardResponseInterface<null> = {
            success: false,
            message: 'INTERNAL_SERVER_ERROR',
            status,
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'SERVER_ERROR', message: 'Internal server error' }]
        };

        authLogger.error('Error in signin controller', response);
        return sendResponse(res, response);
    }
};