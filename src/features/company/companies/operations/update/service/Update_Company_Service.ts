
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { updateCompanyDAO } from '@/features/company/companies/operations/update/dao/Update_Company_Dao';
import { UpdateCompanyInput } from '@/features/company/companies/interfaces/Company_Request.interface';
import { CompanyDetailsResponse } from '@/features/company/companies/interfaces/Company_Response.interface';

export const updateCompanyService = async (
    companyId: string,
    input: UpdateCompanyInput
): Promise<StandardResponseInterface<CompanyDetailsResponse | null>> => {
    try {
        companyLogger.info('Update company - service', {
            action: 'UPDATE_COMPANY',
            companyId,
            input
        });

        const updatedCompany = await updateCompanyDAO.updateCompany(companyId, input);

        if (!updatedCompany) {
            // Check if it was "nothing to update" or "company not found"
            // For now, assuming if input has keys but result is null, it's not found.
            // If input is empty, DAO returns null immediately.
            const hasInput = Object.keys(input).length > 0;

            if (!hasInput) {
                const status = 400;
                return {
                    success: false,
                    status,
                    message: 'NO_DATA_PROVIDED',
                    code: getErrorStatus(status),
                    data: null,
                    errors: [{ field: 'body', message: 'No fields provided for update' }]
                };
            }

            companyLogger.warn('Company not found for update', { companyId });
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

        companyLogger.info('Company updated successfully', { companyId });
        const status = 200;
        return {
            success: true,
            status,
            message: 'COMPANY_UPDATED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: updatedCompany,
            errors: []
        };

    } catch (error: any) {
        companyLogger.error('Error in update company service', { companyId, error });

        // Handle unique constraint violations
        if (error.code === '23505') { // Postgres unique violation code
            const status = 409;
            let message = 'DUPLICATE_ENTRY';
            let field = 'unknown';

            if (error.detail.includes('slug')) {
                message = 'SLUG_ALREADY_EXISTS';
                field = 'slug';
            } else if (error.detail.includes('email')) {
                message = 'EMAIL_ALREADY_EXISTS';
                field = 'email';
            }

            return {
                success: false,
                status,
                message,
                code: getErrorStatus(status),
                data: null,
                errors: [{ field, message: `Company with this ${field} already exists` }]
            };
        }

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
