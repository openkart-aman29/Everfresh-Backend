import { CustomerWithUserDBInterface } from '@/features/customers/interfaces/Customer_DB.interface';
import { CustomerResponse } from '@/features/customers/interfaces/Customer_Response.interface';

/**
 * Maps database customer with user data to API response format
 */
export const mapCustomerDBToResponse = (dbCustomer: CustomerWithUserDBInterface): CustomerResponse => {
    return {
        customer_id: dbCustomer.customer_id,
        company_id: dbCustomer.company_id,
        user_id: dbCustomer.user_id,
        email: dbCustomer.email,
        first_name: dbCustomer.first_name,
        last_name: dbCustomer.last_name,
        phone: dbCustomer.phone,
        total_bookings: dbCustomer.total_bookings,
        lifetime_value: dbCustomer.lifetime_value,
        created_at: dbCustomer.created_at.toISOString(),
        updated_at: dbCustomer.updated_at.toISOString(),
    };
};

/**
 * Builds a safe SQL LIKE pattern for search queries
 */
export const buildSearchPattern = (search: string): string => {
    return `%${search.replace(/[%_]/g, '\\$&')}%`; // Escape wildcards
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