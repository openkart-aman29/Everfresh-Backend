import { Request, Response } from 'express';
import { serviceLogger } from '@/features/services/logger/Service_Logger';
import { readAllServicesService } from '@/features/services/operations/read_all/service/Read_All_Services_Service';
import { sendResponse } from '@/utilities/http/http-response/Standard_Response';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';

interface AuthenticatedRequest extends Request {
    user?: {
        user_id: string;
        company_id: string;
        email: string;
        roles: string[];
    };
}

export const readAllServicesController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Super admins may inspect another tenant's catalogue via ?company_id=;
        // everyone else is pinned to their own.
        const isSuperAdmin = req.user?.roles.includes('super_admin') ?? false;
        const requestedCompanyId = typeof req.query.company_id === 'string' ? req.query.company_id : undefined;
        const companyId = isSuperAdmin && requestedCompanyId ? requestedCompanyId : req.user?.company_id;

        if (!companyId) {
            const status = 400;
            return sendResponse(res, {
                success: false,
                status,
                message: 'COMPANY_ID_REQUIRED',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'company_id', message: 'A company must be specified' }],
            } as StandardResponseInterface<null>);
        }

        const serviceResponse = await readAllServicesService(companyId);

        return sendResponse(res, serviceResponse);
    } catch (error) {
        serviceLogger.error('Unexpected error in read all services controller', { error });
        const status = 500;
        return sendResponse(res, {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error' }],
        } as StandardResponseInterface<null>);
    }
};
