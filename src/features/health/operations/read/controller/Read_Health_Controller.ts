import { Request, Response } from 'express';
import { healthLogger } from '@/features/health/logger/Health_Logger';
import {
    readHealthService,
    readLivenessService,
    readReadinessService
} from '@/features/health/operations/read/service/Read_Health_Service';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';

const buildFailureResponse = (): StandardResponseInterface<null> => {
    const status = 500;
    return {
        success: false,
        status,
        message: 'INTERNAL_SERVER_ERROR',
        code: getErrorStatus(status),
        data: null,
        errors: [{ field: 'server', message: 'Internal server error' }]
    };
};

export const readHealthController = async (req: Request, res: Response) => {
    try {
        const serviceResponse = await readHealthService();
        return sendResponse(res, serviceResponse);
    } catch (error) {
        healthLogger.error('Unexpected error in read health controller', {
            action: 'READ_HEALTH',
            error
        });
        return sendResponse(res, buildFailureResponse());
    }
};

export const readLivenessController = (req: Request, res: Response) => {
    try {
        return sendResponse(res, readLivenessService());
    } catch (error) {
        healthLogger.error('Unexpected error in liveness controller', {
            action: 'READ_LIVENESS',
            error
        });
        return sendResponse(res, buildFailureResponse());
    }
};

export const readReadinessController = async (req: Request, res: Response) => {
    try {
        const serviceResponse = await readReadinessService();
        return sendResponse(res, serviceResponse);
    } catch (error) {
        healthLogger.error('Unexpected error in readiness controller', {
            action: 'READ_READINESS',
            error
        });
        return sendResponse(res, buildFailureResponse());
    }
};
