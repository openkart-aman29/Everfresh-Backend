// src/features/staff/operations/update_staff/dao/Update_Staff_DAO.ts
import { StaffDAO } from '@/features/staff/database/dao/Staff_DAO';
import { StaffWithUserDBInterface } from '@/features/staff/interfaces/Staff_DB.interface';

interface UpdateStaffData {
    firstName?: string;
    lastName?: string;
    phone?: string;
    isAvailable?: boolean;
    skills?: string[];
}

export class UpdateStaffDAO {
    private staffDAO = new StaffDAO();

    async updateStaff(
        staffId: string,
        companyId: string,
        updates: UpdateStaffData
    ): Promise<StaffWithUserDBInterface | null> {
        try {
            // Check if staff exists and belongs to company
            const existingStaff = await this.staffDAO.getStaffById(staffId, companyId);
            if (!existingStaff) {
                return null;
            }

            // Separate user updates from staff updates
            const userUpdates: { first_name?: string; last_name?: string; phone?: string } = {};
            if (updates.firstName !== undefined) userUpdates.first_name = updates.firstName;
            if (updates.lastName !== undefined) userUpdates.last_name = updates.lastName;
            if (updates.phone !== undefined) userUpdates.phone = updates.phone;

            // Update user profile if there are user fields to update
            if (Object.keys(userUpdates).length > 0) {
                await this.staffDAO.updateStaffProfile(staffId, companyId, userUpdates);
            }

            // Update availability if provided
            if (updates.isAvailable !== undefined) {
                await this.staffDAO.updateStaffAvailability(staffId, companyId, updates.isAvailable);
            }

            // Update skills if provided
            if (updates.skills !== undefined) {
                await this.staffDAO.updateStaffSkills(staffId, companyId, updates.skills);
            }

            // Return updated staff data
            return await this.staffDAO.getStaffById(staffId, companyId);
        } catch (error) {
            throw error;
        }
    }
}