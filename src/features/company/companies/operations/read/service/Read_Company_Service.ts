
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readCompanyDAO } from '@/features/company/companies/operations/read/dao/Read_Company_Dao';
import { CompanyDetailsResponse } from '@/features/company/companies/interfaces/Company_Response.interface';

export const readCompanyService = async (
    companyId: string
): Promise<StandardResponseInterface<CompanyDetailsResponse | null>> => {
    try {
        companyLogger.info('Read company - service', {
            action: 'READ_COMPANY',
            companyId
        });

        const company = await readCompanyDAO.getCompanyById(companyId);

        if (!company) {
            companyLogger.warn('Company not found', { companyId });
            const status = 404;
            return {
                success: false,
                status,
                message: 'COMPANY_NOT_FOUND',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'companyId', message: 'Company not found' }]
            };
        }

        companyLogger.info('Company fetched successfully', { companyId });
        const status = 200;
        return {
            success: true,
            status,
            message: 'COMPANY_FETCHED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: company,
            errors: []
        };

    } catch (error) {
        companyLogger.error('Error in read company service', { companyId, error });
        const status = 500;
        return {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error' }]
        };
    }
};
