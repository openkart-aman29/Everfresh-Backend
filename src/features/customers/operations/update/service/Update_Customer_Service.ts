import { customerLogger } from '@/features/customers/logger/Customer_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { updateCustomerUserProfileDAO } from '@/features/customers/operations/update/dao/Update_Customer_DAO';
import { CustomerResponse } from '@/features/customers/interfaces/Customer_Response.interface';
import { readCustomerDAO } from '@/features/customers/operations/read/dao/Read_Customer_DAO';

interface UpdateCustomerInput {
    customerId: string;
    companyId: string;
    updates: {
        firstName?: string;
        lastName?: string;
        phone?: string;
    };
}

export const updateCustomerService = async (
    input: UpdateCustomerInput
): Promise<StandardResponseInterface<CustomerResponse | null>> => {
    try {
        customerLogger.info('Update customer - service', {
            action: 'UPDATE_CUSTOMER',
            customerId: input.customerId,
            companyId: input.companyId,
            updatedFields: Object.keys(input.updates)
        });

        // First, check if customer exists and belongs to company
        const existenceCheck = await readCustomerDAO(input.customerId, input.companyId);

        if (!existenceCheck.success) {
            customerLogger.error('DAO failure during existence check', {
                action: 'UPDATE_CUSTOMER',
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
            customerLogger.warn('Customer not found for update', {
                action: 'UPDATE_CUSTOMER',
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
                errors: [{ field: 'customerId', message: 'Customer not found or does not belong to this company' }]
            };
        }

        // Get user_id from the customer
        const userId = existenceCheck.customer.user_id;

        // Map camelCase to snake_case for DAO
        const daoUpdates: { first_name?: string; last_name?: string; phone?: string } = {};
        if (input.updates.firstName !== undefined) daoUpdates.first_name = input.updates.firstName;
        if (input.updates.lastName !== undefined) daoUpdates.last_name = input.updates.lastName;
        if (input.updates.phone !== undefined) daoUpdates.phone = input.updates.phone;

        // Perform the update
        const updateResult = await updateCustomerUserProfileDAO(userId, daoUpdates);

        if (!updateResult.success) {
            customerLogger.error('DAO failure during update', {
                action: 'UPDATE_CUSTOMER',
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
                errors: [{ field: 'server', message: 'Database error while updating customer' }]
            };
        }

        if (!updateResult.updatedCustomer) {
            customerLogger.warn('Update failed - user not found', {
                action: 'UPDATE_CUSTOMER',
                customerId: input.customerId,
                userId
            });

            const status = 404;
            return {
                success: false,
                status,
                message: 'CUSTOMER_NOT_FOUND',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'customerId', message: 'Customer not found after update attempt' }]
            };
        }

        customerLogger.info('Customer updated successfully', {
            action: 'UPDATE_CUSTOMER',
            customerId: input.customerId,
            companyId: input.companyId
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'CUSTOMER_UPDATED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: updateResult.updatedCustomer,
            errors: []
        };

    } catch (error) {
        customerLogger.error('Error in update customer service', {
            action: 'UPDATE_CUSTOMER',
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
            errors: [{ field: 'server', message: 'Internal server error while updating customer' }]
        };
    }
};