import { StaffWithUserDBInterface } from '@/features/staff/interfaces/Staff_DB.interface';
import { StaffResponse } from '@/features/staff/interfaces/Staff_Response.interface';

/**
 * Maps database staff with user data to API response format
 */
export const mapStaffDBToResponse = (dbStaff: StaffWithUserDBInterface): StaffResponse => {
    return {
    staff_id: dbStaff.staff_id,
    company_id: dbStaff.company_id,
    user_id: dbStaff.user_id,
    email: dbStaff.email,
    first_name: dbStaff.first_name,
    last_name: dbStaff.last_name,
    phone: dbStaff.phone,
    is_available: dbStaff.is_available,
    skills: dbStaff.skills,
    is_Active: dbStaff.is_active,
    created_at: dbStaff.created_at,
    updated_at: dbStaff.updated_at,
    work_metrics: {
        total_hours_worked: 0,
        current_month_hours: 0
    },
    next_confirmed_booking: null
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