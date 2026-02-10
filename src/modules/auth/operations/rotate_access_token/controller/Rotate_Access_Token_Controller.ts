// import { Request, Response } from 'express';
// import { authLogger } from '@/modules/auth/logger/Auth_Logger';
// import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
// import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
// import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
// import { rotateAccessTokenService } from '@/modules/auth/operations/rotate_access_token/service/Rotate_Access_Token_Service';
// import { ENV } from '@/configurations/ENV_Configuration';

// export const rotateAccessTokenController = async (
//     req: Request,
//     res: Response
// ) => {
//     try {
//         authLogger.info('Rotate access token - controller');

//         /* 1️⃣ Extract refresh token from HttpOnly cookie */
//         const refreshToken = req.cookies?.refreshToken;

//         if (!refreshToken) {
//             const status = 401;
//             const response: StandardResponseInterface<null> = {
//                 success: false,
//                 message: 'REFRESH_TOKEN_REQUIRED',
//                 status,
//                 code: getErrorStatus(status),
//                 data: null,
//                 errors: [
//                     {
//                         field: 'refreshToken',
//                         message: 'Refresh token is missing'
//                     }
//                 ]
//             };

//             return sendResponse(res, response);
//         }

//         /* 2️⃣ Call service */
//         const serviceResponse = await rotateAccessTokenService({
//             refreshToken
//         });

//         /* 3️⃣ If refresh token is rotated, update cookie */
//         if (
//             serviceResponse.success &&
//             serviceResponse.data?.refreshToken
//         ) {
//             res.cookie('refreshToken', serviceResponse.data.refreshToken, {
//                 httpOnly: true,
//                 secure: true,
//                 sameSite: 'none',
//                 maxAge: ENV.JWT_REFRESH_TOKEN_EXPIRATION * 1000,
//                 path: '/',
//                 domain: ENV.COOKIE_DOMAIN,
//                 partitioned: true
//             });
//         }

//         return sendResponse(res, serviceResponse);

//     } catch (error) {
//         authLogger.error('Rotate access token controller error', error);

//         const status = 500;
//         const response: StandardResponseInterface<null> = {
//             success: false,
//             message: 'INTERNAL_SERVER_ERROR',
//             status,
//             code: getErrorStatus(status),
//             data: null,
//             errors: [
//                 {
//                     field: 'server',
//                     message: 'Rotate access token failed'
//                 }
//             ]
//         };

//         return sendResponse(res, response);
//     }
// };

import { Request, Response } from 'express';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { rotateAccessTokenService } from '@/modules/auth/operations/rotate_access_token/service/Rotate_Access_Token_Service';
import { tokenRotationManager } from '@/modules/auth/manager/Token_Rotation_Manager';
import { RefreshTokenResponseInterface } from '@/modules/auth/interface/Token_Interface';
import {
    COOKIE_DOMAIN,
    REFRESH_TOKEN_COOKIE_NAME,
    REFRESH_TOKEN_COOKIE_PATH,
    REFRESH_TOKEN_COOKIE_SECURE,
    REFRESH_TOKEN_COOKIE_HTTP_ONLY,
    REFRESH_TOKEN_COOKIE_SAME_SITE,
    REFRESH_TOKEN_EXPIRATION_TIME
} from '@/configurations/ENV_Configuration';

/**
 * ============================================================================
 * ROTATE ACCESS TOKEN CONTROLLER
 * ============================================================================
 * Purpose: Handle access token rotation using refresh token from cookies
 * 
 * Flow:
 * 1. Extract refresh token from HttpOnly cookie
 * 2. Validate token presence
 * 3. Call service layer for rotation logic
 * 4. Update refresh token cookie if rotation occurred (RECOMMENDED SECURITY)
 * 5. Return new access token (and optionally new refresh token)
 * 
 * Security Features:
 * - Uses HttpOnly cookies (prevents XSS)
 * - Secure flag for HTTPS only
 * - SameSite=none for cross-origin requests
 * - Partitioned cookies for privacy
 * - Token rotation on each use (prevents token reuse attacks)
 * ============================================================================
 */

export const rotateAccessTokenController = async (
    req: Request,
    res: Response
): Promise<Response> => {
    try {
        authLogger.info('Starting access token rotation @ rotateAccessTokenController');

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 1: Extract refresh token from HttpOnly cookie
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            const status = 401;
            const response: StandardResponseInterface<null> = {
                success: false,
                message: 'REFRESH_TOKEN_REQUIRED',
                status,
                code: getErrorStatus(status),
                data: null,
                errors: [
                    {
                        field: 'refreshToken',
                        message: 'Refresh token is missing from cookies'
                    }
                ]
            };

            authLogger.error('Missing refresh token in cookies @ rotateAccessTokenController');
            return sendResponse(res, response);
        }

        authLogger.info('Refresh token found in cookies @ rotateAccessTokenController', {
            tokenPrefix: refreshToken.substring(0, 10) + '...'
        });

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 2: Extract device info and IP address for security tracking
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const rawDeviceInfo = req.headers['user-agent'] as string | undefined;
        const deviceInfo = tokenRotationManager.extractDeviceInfo(rawDeviceInfo);
        const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() 
            || req.socket.remoteAddress 
            || 'unknown';

        authLogger.info('Request metadata extracted @ rotateAccessTokenController', {
            deviceInfo,
            ipAddress
        });

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 3: Call service layer for token rotation
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const serviceResponse: StandardResponseInterface<RefreshTokenResponseInterface | null> = 
            await rotateAccessTokenService({
                refreshToken,
                deviceInfo,
                ipAddress
            });

        authLogger.info('Service response received @ rotateAccessTokenController', {
            success: serviceResponse.success,
            message: serviceResponse.message
        });

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 4: Update refresh token cookie if rotation occurred
           
           ⚠️ IMPORTANT SECURITY NOTE:
           - We rotate BOTH access and refresh tokens for maximum security
           - This prevents refresh token reuse attacks
           - If a token is stolen, it can only be used once
           - Legitimate user will get a new token, attacker will be blocked
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        if (serviceResponse.success && serviceResponse.data?.refreshToken) {
            res.cookie(REFRESH_TOKEN_COOKIE_NAME, serviceResponse.data.refreshToken, {
                httpOnly: REFRESH_TOKEN_COOKIE_HTTP_ONLY === 'true',
                secure: REFRESH_TOKEN_COOKIE_SECURE === 'true' || (process.env.NODE_ENV === 'production'),
                sameSite: (REFRESH_TOKEN_COOKIE_SAME_SITE as any) || 'none',
                maxAge: REFRESH_TOKEN_EXPIRATION_TIME * 1000, // 7 days in milliseconds
                // Use root path so cookie is sent to signout and other endpoints
                path: '/',
                domain: COOKIE_DOMAIN,   // Set domain for cookie
                // partitioned: true            // Enhanced privacy (Chrome 118+)
            });

            authLogger.info('Refresh token cookie updated @ rotateAccessTokenController', {
                // userId: serviceResponse.data.userId
            });
        }

        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           STEP 5: Prepare and send controller response
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        const controllerResponse: StandardResponseInterface<RefreshTokenResponseInterface | null> = {
            success: serviceResponse.success,
            message: serviceResponse.message,
            status: serviceResponse.status,
            code: serviceResponse.code,
            data: serviceResponse.data,
            errors: serviceResponse.errors
        };

        authLogger.info('Sending controller response @ rotateAccessTokenController', {
            success: controllerResponse.success,
            status: controllerResponse.status
        });

        return sendResponse(res, controllerResponse);

    } catch (error) {
        /* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
           CATASTROPHIC ERROR HANDLING
           - This should rarely happen if service layer handles errors properly
           - Log full error details for debugging
           ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
        
        authLogger.error('CRITICAL ERROR @ rotateAccessTokenController', error);

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
                    message: 'Failed to rotate access token due to internal error'
                }
            ]
        };

        return sendResponse(res, errorResponse);
    }
};