import { serviceLogger } from '@/features/services/logger/Service_Logger';
import {
    readAllServicesDAO,
    ServiceListItem,
} from '@/features/services/operations/read_all/dao/Read_All_Services_Dao';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';

export const readAllServicesService = async (
    companyId: string
): Promise<StandardResponseInterface<{ services: ServiceListItem[]; total: number } | null>> => {
    try {
        serviceLogger.info('Read all services - service', {
            action: 'READ_ALL_SERVICES',
            companyId,
        });

        const services = await readAllServicesDAO.listServices(companyId);

        return {
            success: true,
            status: 200,
            message: 'SERVICES_FETCHED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: { services, total: services.length },
            errors: [],
        };
    } catch (error) {
        serviceLogger.error('Error in read all services service', { companyId, error });
        const status = 500;
        return {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error' }],
        };
    }
};
