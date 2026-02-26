
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { deleteCompanyDAO } from '@/features/company/companies/operations/delete/dao/Delete_Company_Dao';

export const deleteCompanyService = async (
    companyId: string
): Promise<StandardResponseInterface<null>> => {
    try {
        companyLogger.info('Delete company - service', {
            action: 'DELETE_COMPANY',
            companyId
        });

        const deleted = await deleteCompanyDAO.deleteCompany(companyId);

        if (!deleted) {
            companyLogger.warn('Company not found for deletion', { companyId });
            const status = 404;
            return {
                success: false,
                status,
                message: 'COMPANY_NOT_FOUND',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'companyId', message: 'Company not found or already deleted' }]
            };
        }

        companyLogger.info('Company deleted successfully', { companyId });
        const status = 200;
        return {
            success: true,
            status,
            message: 'COMPANY_DELETED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: null,
            errors: []
        };

    } catch (error) {
        companyLogger.error('Error in delete company service', { companyId, error });
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
