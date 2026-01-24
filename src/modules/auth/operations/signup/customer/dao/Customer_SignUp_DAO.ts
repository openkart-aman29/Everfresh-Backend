import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
import { generateULID } from '@/utilities/id_generator/ULID_Generator';
import { CreateUserInterface } from '@/modules/auth/interface/Auth_Interface';
import { PoolClient } from 'pg';

interface CustomerProfileData {
    customer_id: string;
    company_id: string;
    user_id: string;
}

class CustomerSignUpDAO extends BaseAuthDAO {
    async createCustomerWithProfile(
        userData: CreateUserInterface,
        customerData: CustomerProfileData
    ): Promise<{ success: boolean; user?: any; customer?: any }> {
        const pool = this.getPool();
        if (!pool) {
            return { success: false };
        }

        const client: PoolClient = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Create user
            const userQuery = `
                INSERT INTO users (
                    user_id, company_id, email, password_hash,
                    first_name, last_name, phone,
                    is_active, email_verified, phone_verified,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                RETURNING *
            `;

            const userValues = [
                userData.user_id,
                userData.company_id,
                userData.email,
                userData.password_hash,
                userData.first_name,
                userData.last_name,
                userData.phone || null,
                userData.is_active,
                userData.email_verified,
                userData.phone_verified,
                new Date(),
                new Date()
            ];

            const userResult = await client.query(userQuery, userValues);
            const user = userResult.rows[0];

            // 2. Create customer profile
            const customerQuery = `
                INSERT INTO customers (
                    customer_id, company_id, user_id,
                    total_bookings, lifetime_value,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING *
            `;

            const customerValues = [
                customerData.customer_id,
                customerData.company_id,
                customerData.user_id,
                0, // total_bookings
                0.00, // lifetime_value
                new Date(),
                new Date()
            ];

            const customerResult = await client.query(customerQuery, customerValues);
            const customer = customerResult.rows[0];

            // 3. Assign customer role
            const roleQuery = `
                INSERT INTO user_roles (user_role_id, user_id, role_id, assigned_by, created_at)
                SELECT $1, $2, role_id, $3, $4
                FROM roles
                WHERE role_code = 'customer'
            `;

            const userRoleId = generateULID();
            await client.query(roleQuery, [
                userRoleId,
                userData.user_id,
                userData.user_id, // self-assigned for customer registration
                new Date()
            ]);

            await client.query('COMMIT');

            this.logInfo('createCustomerWithProfile', {
                user_id: user.user_id,
                customer_id: customer.customer_id
            });

            return {
                success: true,
                user,
                customer
            };

        } catch (error) {
            await client.query('ROLLBACK');
            this.logError('createCustomerWithProfile', error);
            return { success: false };
        } finally {
            client.release();
        }
    }
}

export async function createCustomerWithProfile(
    userData: CreateUserInterface,
    customerData: CustomerProfileData
): Promise<{ success: boolean; user?: any; customer?: any }> {
    const dao = new CustomerSignUpDAO();
    return dao.createCustomerWithProfile(userData, customerData);
}