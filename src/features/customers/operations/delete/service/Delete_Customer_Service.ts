import { customerLogger } from '@/features/customers/logger/Customer_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { softDeleteCustomerDAO } from '@/features/customers/operations/delete/dao/Delete_Customer_DAO';
import { readCustomerDAO } from '@/features/customers/operations/read/dao/Read_Customer_DAO';

interface DeleteCustomerInput {
    customerId: string;
    companyId: string;
}

export const deleteCustomerService = async (
    input: DeleteCustomerInput
): Promise<StandardResponseInterface<null>> => {
    try {
        customerLogger.info('Delete customer - service', {
            action: 'DELETE_CUSTOMER',
            customerId: input.customerId,
            companyId: input.companyId
        });

        // Check if customer exists and belongs to company (and is not already deleted)
        const existenceCheck = await readCustomerDAO(input.customerId, input.companyId);

        if (!existenceCheck.success) {
            customerLogger.error('DAO failure during existence check for delete', {
                action: 'DELETE_CUSTOMER',
                customerId: input.customerId,
                companyId: input.companyId
            });

            const status = 500;
            return {
                success: false,
                status,
                message: 'INTERNAL_SERVER_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'server', message: 'Database error while checking customer existence' }]
            };
        }

        if (!existenceCheck.customer) {
            customerLogger.warn('Customer not found or already deleted', {
                action: 'DELETE_CUSTOMER',
                customerId: input.customerId,
                companyId: input.companyId
            });

            const status = 404;
            return {
                success: false,
                status,
                message: 'CUSTOMER_NOT_FOUND',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'customerId', message: 'Customer not found or already deleted' }]
            };
        }

        // Perform soft delete
        const deleteResult = await softDeleteCustomerDAO(input.customerId, input.companyId);

        if (!deleteResult.success) {
            customerLogger.error('DAO failure during delete', {
                action: 'DELETE_CUSTOMER',
                customerId: input.customerId,
                companyId: input.companyId
            });

            const status = 500;
            return {
                success: false,
                status,
                message: 'INTERNAL_SERVER_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'server', message: 'Database error while deleting customer' }]
            };
        }

        if (!deleteResult.deleted) {
            // This shouldn't happen since we checked existence, but just in case
            customerLogger.warn('Delete failed - no rows affected', {
                action: 'DELETE_CUSTOMER',
                customerId: input.customerId,
                companyId: input.companyId
            });

            const status = 404;
            return {
                success: false,
                status,
                message: 'CUSTOMER_NOT_FOUND',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'customerId', message: 'Customer not found or already deleted' }]
            };
        }

        customerLogger.info('Customer deleted successfully', {
            action: 'DELETE_CUSTOMER',
            customerId: input.customerId,
            companyId: input.companyId
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'CUSTOMER_DELETED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: null,
            errors: []
        };

    } catch (error) {
        customerLogger.error('Error in delete customer service', {
            action: 'DELETE_CUSTOMER',
            customerId: input.customerId,
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
            errors: [{ field: 'server', message: 'Internal server error while deleting customer' }]
        };
    }
};