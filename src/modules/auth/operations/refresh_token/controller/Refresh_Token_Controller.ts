import { Request, Response } from 'express';
import { authLogger } from '@/modules/auth/logger/Auth_Logger';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { refreshTokenService } from '@/modules/auth/operations/refresh_token/service/Refresh_Token_Service';
import { tokenRotationManager } from '@/modules/auth/manager/Token_Rotation_Manager';
import { RefreshTokenRequestInterface } from '@/modules/auth/interface/Token_Interface';

export const refreshTokenController = async (req: Request, res: Response) => {
    try {
        authLogger.info('Refresh token controller');

        // Validate request body
        const input: RefreshTokenRequestInterface = req.body;

        if (!input || !input.refreshToken) {
            const status = 400;
            const response: StandardResponseInterface<null> = {
                success: false,
                status,
                message: 'VALIDATION_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'refreshToken', message: 'Refresh token is required' }]
            };
            return sendResponse(res, response);
        }

        // Extract device info and IP
        const rawDeviceInfo = req.headers['user-agent'] as string | undefined;
        const deviceInfo = tokenRotationManager.extractDeviceInfo(rawDeviceInfo);
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;

        // Call service
        const serviceResponse = await refreshTokenService(
            input,
            deviceInfo,
            ipAddress
        );

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

        authLogger.error('Error in refresh token controller', response);
        return sendResponse(res, response);
    }
};