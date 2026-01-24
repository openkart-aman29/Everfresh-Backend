// src/features/staff/operations/read_all_staff/dao/Read_All_Staff_DAO.ts
import { StaffDAO } from '@/features/staff/database/dao/Staff_DAO';
import { mapStaffDBToResponse } from '@/features/staff/utils/Staff_Utils';
import { StaffResponse } from '@/features/staff/interfaces/Staff_Response.interface';

interface ReadAllStaffResult {
    staff: StaffResponse[];
    totalCount: number;
}

/**
 * DAO: Fetch paginated list of staff with search, availability filter and sorting
 */
export class ReadAllStaffDAO {
    private staffDAO = new StaffDAO();

    async readAllStaff(
        companyId: string,
        limit: number,
        offset: number,
        search?: string,
        sortBy: string = 'created_at',
        sortOrder: string = 'desc',
        availableOnly?: boolean
    ): Promise<{ success: boolean; data?: ReadAllStaffResult }> {
        try {
            // Get staff list and count in parallel
            const [staffList, totalCount] = await Promise.all([
                this.staffDAO.getAllStaff(companyId, limit, offset, search, sortBy, sortOrder, availableOnly || false),
                this.staffDAO.getStaffCount(companyId, search, availableOnly || false)
            ]);

            // Map to API response
            const staff: StaffResponse[] = staffList.map(staffDB => mapStaffDBToResponse(staffDB));

            return {
                success: true,
                data: {
                    staff,
                    totalCount
                }
            };

        } catch (error) {
            return { success: false };
        }
    }
}

export async function readAllStaffDAO(
    companyId: string,
    limit: number,
    offset: number,
    search?: string,
    sortBy?: string,
    sortOrder?: string,
    availableOnly?: boolean
): Promise<{ success: boolean; data?: ReadAllStaffResult }> {
    const dao = new ReadAllStaffDAO();
    return dao.readAllStaff(companyId, limit, offset, search, sortBy, sortOrder, availableOnly);
}