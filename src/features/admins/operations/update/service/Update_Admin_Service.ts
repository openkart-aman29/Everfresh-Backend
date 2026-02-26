
import { adminLogger } from '@/features/admins/logger/Admin_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { updateAdminDAO } from '@/features/admins/operations/update/dao/Update_Admin_Dao';
import { AdminDetailsResponse } from '@/features/admins/interfaces/Admin_Response.interface';
import { UpdateAdminInput } from '@/features/admins/interfaces/Admin_Request.interface';

export const updateAdminService = async (
    input: UpdateAdminInput
): Promise<StandardResponseInterface<AdminDetailsResponse | null>> => {
    try {
        adminLogger.info('Update admin - service', {
            action: 'UPDATE_ADMIN',
            adminId: input.adminId,
            companyId: input.companyId,
            updatedFields: Object.keys(input.updates)
        });

        // Call DAO
        const updatedAdmin = await updateAdminDAO(input);

        if (!updatedAdmin) {
            adminLogger.warn('Admin not found for update', {
                action: 'UPDATE_ADMIN',
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

        adminLogger.info('Admin updated successfully', {
            action: 'UPDATE_ADMIN',
            adminId: input.adminId,
            companyId: input.companyId
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'ADMIN_UPDATED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: updatedAdmin,
            errors: []
        };

    } catch (error: any) {
        adminLogger.error('Error in update admin service', {
            action: 'UPDATE_ADMIN',
            adminId: input.adminId,
            companyId: input.companyId,
            error
        });

        // Handle unique constraint violation (e.g., email already exists)
        if (error.code === '23505') { // Postgres unique violation code
            const status = 409;
            return {
                success: false,
                status,
                message: 'EMAIL_ALREADY_EXISTS',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'email', message: 'This email is already registered' }]
            };
        }

        const status = 500;
        return {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error while updating admin' }]
        };
    }
};
