import { Request, Response } from 'express';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { signInZodSchema } from '@/modules/auth/operations/signin/zod_schema/SignIn_Zod_Schema';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { signInService } from '@/modules/auth/operations/signin/service/SignIn_Service';
import { tokenRotationManager } from '@/modules/auth/manager/Token_Rotation_Manager';
import {
    COOKIE_DOMAIN,
    REFRESH_TOKEN_EXPIRATION_TIME,
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_PATH,
    REFRESH_TOKEN_COOKIE_SECURE,
    REFRESH_TOKEN_COOKIE_HTTP_ONLY,
    REFRESH_TOKEN_COOKIE_SAME_SITE
} from "@/configurations/ENV_Configuration";
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
        const rawDeviceInfo = req.headers['user-agent'] as string | undefined;
        const deviceInfo = tokenRotationManager.extractDeviceInfo(rawDeviceInfo);
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

            // Set refresh token as HTTP-Only, Secure, and with SameSite settings (env-driven)
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, serviceResponse.data.refreshToken, {
                httpOnly: REFRESH_TOKEN_COOKIE_HTTP_ONLY === 'true',
                secure: REFRESH_TOKEN_COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production'),
                sameSite: (REFRESH_TOKEN_COOKIE_SAME_SITE as any) || 'none',
                maxAge: REFRESH_TOKEN_EXPIRATION_TIME * 1000, // Convert seconds to milliseconds
                // Use root path so cookie is sent to signout and other endpoints
                path: '/',
                domain: COOKIE_DOMAIN,
                // partitioned: true // Enhanced privacy (Chrome 118+)
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