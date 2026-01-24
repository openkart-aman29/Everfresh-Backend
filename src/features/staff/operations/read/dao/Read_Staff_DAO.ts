// src/features/staff/operations/read_single_staff/dao/Read_Single_Staff_DAO.ts
import { StaffDAO } from '@/features/staff/database/dao/Staff_DAO';
import { StaffWithUserDBInterface } from '@/features/staff/interfaces/Staff_DB.interface';

/**
 * DAO: Fetch single staff with full details
 */
export class ReadStaffDAO {
    private staffDAO = new StaffDAO();

    async getStaffById(
        staffId: string,
        companyId: string
    ): Promise<StaffWithUserDBInterface | null> {
        return await this.staffDAO.getStaffById(staffId, companyId);
    }
}