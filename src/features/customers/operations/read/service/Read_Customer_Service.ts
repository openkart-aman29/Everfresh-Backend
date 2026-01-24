import { customerLogger } from '@/features/customers/logger/Customer_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { CustomerDAO } from '@/features/customers/database/dao/Customer_DAO';
import { mapCustomerDBToResponse } from '@/features/customers/utils/Customer_Utils';
import { CustomerResponse } from '@/features/customers/interfaces/Customer_Response.interface';

interface ReadCustomerInput {
    customerId: string;
    companyId: string;
}

export const readCustomerService = async (
    input: ReadCustomerInput
): Promise<StandardResponseInterface<CustomerResponse | null>> => {
    try {
        customerLogger.info('Read single customer - service', {
            action: 'READ_CUSTOMER',
            customerId: input.customerId,
            companyId: input.companyId
        });

        const customerDAO = new CustomerDAO();

        // Fetch customer from DAO
        const customerDB = await customerDAO.getCustomerById(input.customerId, input.companyId);

        if (!customerDB) {
            customerLogger.warn('Customer not found', {
                action: 'READ_CUSTOMER',
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

        // Map DB result to API response
        const customerResponse = mapCustomerDBToResponse(customerDB);

        customerLogger.info('Customer fetched successfully', {
            action: 'READ_CUSTOMER',
            customerId: input.customerId,
            companyId: input.companyId
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'CUSTOMER_RETRIEVED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: customerResponse,
            errors: []
        };

    } catch (error) {
        customerLogger.error('Error in read single customer service', {
            action: 'READ_SINGLE_CUSTOMER',
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
            errors: [{ field: 'server', message: 'Internal server error while retrieving customer' }]
        };
    }
};