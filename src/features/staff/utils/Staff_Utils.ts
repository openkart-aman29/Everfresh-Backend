import { StaffWithUserDBInterface } from '@/features/staff/interfaces/Staff_DB.interface';
import { StaffResponse } from '@/features/staff/interfaces/Staff_Response.interface';

/**
 * Maps database staff with user data to API response format
 */
export const mapStaffDBToResponse = (dbStaff: StaffWithUserDBInterface): StaffResponse => {
    return {
        staffId: dbStaff.staff_id,
        companyId: dbStaff.company_id,
        userId: dbStaff.user_id,
        email: dbStaff.email,
        firstName: dbStaff.first_name,
        lastName: dbStaff.last_name,
        phone: dbStaff.phone,
        isAvailable: dbStaff.is_available,
        skills: dbStaff.skills,
        createdAt: dbStaff.created_at.toISOString(),
        updatedAt: dbStaff.updated_at.toISOString(),
    };
};

/**
 * Builds a safe SQL LIKE pattern for search queries
 */
export const buildSearchPattern = (search: string): string => {
    return `%${search.replace(/[%_]/g, '\\$&')}%`;
};

/**
 * Picks only allowed fields from an object
 */
export const pickFields = <T extends Record<string, any>, K extends keyof T>(
    obj: T,
    keys: K[]
): Pick<T, K> => {
    const result = {} as Pick<T, K>;
    keys.forEach(key => {
        if (key in obj) {
            result[key] = obj[key];
        }
    });
    return result;
};