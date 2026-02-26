
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAllCompanyDAO } from '@/features/company/companies/operations/read_all/dao/Read_All_Company_Dao';
import { PaginatedCompanyResponse } from '@/features/company/companies/interfaces/Company_Response.interface';
import { ReadAllCompaniesInput } from '@/features/company/companies/interfaces/Company_Request.interface';

export const readAllCompaniesService = async (
    input: ReadAllCompaniesInput
): Promise<StandardResponseInterface<PaginatedCompanyResponse>> => {
    try {
        companyLogger.info('Read all companies - service', {
            action: 'READ_ALL_COMPANIES',
            input
        });

        const paginatedResult = await readAllCompanyDAO.getAllCompanies(input);

        companyLogger.info('All companies fetched successfully', {
            count: paginatedResult.data.length,
            total: paginatedResult.pagination.total
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'COMPANIES_FETCHED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: paginatedResult,
            errors: []
        };

    } catch (error) {
        companyLogger.error('Error in read all companies service', { input, error });
        const status = 500;
        return {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null as any,
            errors: [{ field: 'server', message: 'Internal server error' }]
        };
    }
};
