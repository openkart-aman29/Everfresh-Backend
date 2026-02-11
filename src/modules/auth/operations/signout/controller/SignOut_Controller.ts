import { Request, Response } from 'express';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { signOutService } from '@/modules/auth/operations/signout/service/SignOut_Service';
import {
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_PATH,
    REFRESH_TOKEN_COOKIE_SECURE,
    REFRESH_TOKEN_COOKIE_HTTP_ONLY,
    REFRESH_TOKEN_COOKIE_SAME_SITE,
    COOKIE_DOMAIN
} from '@/configurations/ENV_Configuration';

interface RequestWithCookies extends Request {
    cookies: {
        [key: string]: string;
    };
}

export const signOutController = async (req: RequestWithCookies, res: Response) => {
    try {
        authLogger.info('SignOut controller');

        // User should be authenticated (middleware sets req.user)
        if (!req.user || !req.user.user_id) {
            const status = 401;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'UNAUTHORIZED',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'auth', message: 'Authentication required' }]
            };
            return sendResponse(res, response);
        }

        // 1. Extract refresh token from cookies
        const refreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME];

        if (!refreshToken) {
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                message: 'MISSING_REFRESH_TOKEN',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'refreshToken', message: 'Refresh token not found in cookies' }],
            };
            authLogger.error('Missing refresh token in cookies @ signOutController');
            return sendResponse(res, response);
        }

        authLogger.info('Refresh token found in cookies @ signOutController');

        // // Validate request body
        // const validationResult = signOutZodSchema.safeParse(req.body);

        // if (!validationResult.success) {
        //     const validationErrors = validationResult.error.issues.map(issue => ({
        //         field: issue.path.join('.'),
        //         message: issue.message
        //     }));

        //     const status = 400;
        //     const response: StandardResponseInterface<null> = {
        //         success: false,
        //         status,
        //         message: 'VALIDATION_ERROR',
        //         code: getErrorStatus(status),
        //         data: null,
        //         errors: validationErrors
        //     };

        //     return sendResponse(res, response);
        // }

        // Call service
        const serviceResponse = await signOutService(
            refreshToken
        );
        // 3. If successful, clear the refresh token cookie
        if (serviceResponse.success) {
            // Clear cookie using the same attributes it was set with
            res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
                httpOnly: REFRESH_TOKEN_COOKIE_HTTP_ONLY === 'true',
                secure: REFRESH_TOKEN_COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production'),
                sameSite: (REFRESH_TOKEN_COOKIE_SAME_SITE as any) || 'none',
                // Must match the path used when setting the cookie
                path: '/',
                domain: COOKIE_DOMAIN,
            });
            authLogger.info('Refresh token cookie cleared @ signOutController');
        }

        // 4. Prepare the controller response
        const controllerResponse: StandardResponseInterface<null> = {
            success: serviceResponse.success,
            message: serviceResponse.message,
            status: serviceResponse.status,
            code: serviceResponse.code,
            data: serviceResponse.data,
            errors: serviceResponse.errors,
        };
        authLogger.info('responseFromController From signOutController @ signOutController = ', controllerResponse);
        return sendResponse(res, controllerResponse);

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

        authLogger.error('Error in signout controller', response);
        return sendResponse(res, response);
    }
};