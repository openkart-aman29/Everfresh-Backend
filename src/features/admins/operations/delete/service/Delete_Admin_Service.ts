
import { adminLogger } from '@/features/admins/logger/Admin_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { deleteAdminDAO } from '@/features/admins/operations/delete/dao/Delete_Admin_Dao';

interface DeleteAdminInput {
    adminId: string;
    companyId: string | null;
}

export const deleteAdminService = async (
    input: DeleteAdminInput
): Promise<StandardResponseInterface<null>> => {
    try {
        adminLogger.info('Delete admin - service', {
            action: 'DELETE_ADMIN',
            adminId: input.adminId,
            companyId: input.companyId
        });

        // Attempt soft delete
        const deleted = await deleteAdminDAO(input.adminId, input.companyId);

        if (!deleted) {
            adminLogger.warn('Admin not found for deletion', {
                action: 'DELETE_ADMIN',
                adminId: input.adminId,
                companyId: input.companyId
            });

            const status = 404;
            return {
                success: false,
                status,
                message: 'ADMIN_NOT_FOUND',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'adminId', message: 'Admin not found or does not belong to this company' }]
            };
        }

        adminLogger.info('Admin deleted successfully', {
            action: 'DELETE_ADMIN',
            adminId: input.adminId,
            companyId: input.companyId
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'ADMIN_DELETED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: null,
            errors: []
        };

    } catch (error) {
        adminLogger.error('Error in delete admin service', {
            action: 'DELETE_ADMIN',
            adminId: input.adminId,
            companyId: input.companyId,
            error
        });

        const status = 500;
        return {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error while deleting admin' }]
        };
    }
};
