import { customerLogger } from '@/features/customers/logger/Customer_Logger';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { readAllCustomersDAO } from '@/features/customers/operations/read_all/dao/Read_All_Customers_DAO';
import { CustomerResponse } from '@/features/customers/interfaces/Customer_Response.interface';

interface ReadAllCustomersInput {
    companyId: string;
    page: number;
    limit: number;
    offset: number;
    search?: string;
    sortBy: string;
    sortOrder: string;
}

interface PaginatedCustomersResponse {
    customers: CustomerResponse[];
    pagination: {
        page: number;
        limit: number;
        totalRecords: number;
        totalPages: number;
    };
}

export const readAllCustomersService = async (
    input: ReadAllCustomersInput
): Promise<StandardResponseInterface<PaginatedCustomersResponse | null>> => {
    try {
        customerLogger.info('Read all customers - service', {
            action: 'READ_ALL_CUSTOMERS',
            companyId: input.companyId,
            page: input.page,
            limit: input.limit,
            search: input.search,
            sortBy: input.sortBy,
            sortOrder: input.sortOrder
        });

        // Call DAO
        const result = await readAllCustomersDAO(
            input.companyId,
            input.limit,
            input.offset,
            input.search,
            input.sortBy,
            input.sortOrder
        );

        if (!result.success) {
            customerLogger.error('DAO failure in read all customers service', {
                action: 'READ_ALL_CUSTOMERS',
                companyId: input.companyId,
                page: input.page,
                limit: input.limit
            });

            const status = 500;
            return {
                success: false,
                status,
                message: 'INTERNAL_SERVER_ERROR',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'server', message: 'Database error while retrieving customers' }]
            };
        }

        const { customers, totalCount } = result.data!;
        const totalPages = Math.ceil(totalCount / input.limit);

        const responseData: PaginatedCustomersResponse = {
            customers,
            pagination: {
                page: input.page,
                limit: input.limit,
                totalRecords: totalCount,
                totalPages
            }
        };

        customerLogger.info('Customers list retrieved successfully', {
            action: 'READ_ALL_CUSTOMERS',
            companyId: input.companyId,
            totalRecords: totalCount,
            returnedRecords: customers.length
        });

        const status = 200;
        return {
            success: true,
            status,
            message: 'CUSTOMERS_RETRIEVED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: responseData,
            errors: []
        };

    } catch (error) {
        customerLogger.error('Error in read all customers service', {
            action: 'READ_ALL_CUSTOMERS',
            companyId: input.companyId,
            page: input.page,
            limit: input.limit,
            error
        });

        const status = 500;
        return {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error while retrieving customers' }]
        };
    }
};