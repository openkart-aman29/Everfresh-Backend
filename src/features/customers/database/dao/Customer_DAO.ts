import { getDatabase } from '@/database/Database_Connection_Manager';
import { CustomerDBInterface, CustomerWithUserDBInterface } from '@/features/customers/interfaces/Customer_DB.interface';
import { customerLogger } from '@/features/customers/logger/Customer_Logger';

export class CustomerDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            customerLogger.error('Database pool not available');
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async getCustomerById(customerId: string, companyId: string): Promise<CustomerWithUserDBInterface | null> {
        try {
            const pool = this.getPool();
            const query = `
                SELECT
                    c.customer_id,
                    c.company_id,
                    c.user_id,
                    c.total_bookings,
                    c.lifetime_value,
                    c.created_at,
                    c.updated_at,
                    c.deleted_at,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone
                FROM customers c
                JOIN users u ON c.user_id = u.user_id
                WHERE c.customer_id = $1
                  AND c.company_id = $2
                  AND c.deleted_at IS NULL
                  AND u.deleted_at IS NULL
            `;
            const result = await pool.query(query, [customerId, companyId]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (error) {
            customerLogger.error('Error fetching customer by ID', { customerId, companyId, error });
            throw error;
        }
    }

    async getAllCustomers(
        companyId: string,
        limit: number,
        offset: number,
        search?: string
    ): Promise<CustomerWithUserDBInterface[]> {
        try {
            const pool = this.getPool();
            let query = `
                SELECT
                    c.customer_id,
                    c.company_id,
                    c.user_id,
                    c.total_bookings,
                    c.lifetime_value,
                    c.created_at,
                    c.updated_at,
                    c.deleted_at,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone
                FROM customers c
                JOIN users u ON c.user_id = u.user_id
                WHERE c.company_id = $1
                  AND c.deleted_at IS NULL
                  AND u.deleted_at IS NULL
            `;
            const params: any[] = [companyId];
            let paramIndex = 2;

            if (search) {
                query += ` AND (u.email ILIKE $${paramIndex} OR u.first_name ILIKE $${paramIndex} OR u.last_name ILIKE $${paramIndex} OR u.phone ILIKE $${paramIndex})`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);

            const result = await pool.query(query, params);
            return result.rows;
        } catch (error) {
            customerLogger.error('Error fetching all customers', { companyId, limit, offset, search, error });
            throw error;
        }
    }

    async getTotalCustomersCount(companyId: string, search?: string): Promise<number> {
        try {
            const pool = this.getPool();
            let query = `
                SELECT COUNT(*) as total
                FROM customers c
                JOIN users u ON c.user_id = u.user_id
                WHERE c.company_id = $1
                  AND c.deleted_at IS NULL
                  AND u.deleted_at IS NULL
            `;
            const params: any[] = [companyId];

            if (search) {
                query += ` AND (u.email ILIKE $2 OR u.first_name ILIKE $2 OR u.last_name ILIKE $2 OR u.phone ILIKE $2)`;
                params.push(`%${search}%`);
            }

            const result = await pool.query(query, params);
            return parseInt(result.rows[0].total, 10);
        } catch (error) {
            customerLogger.error('Error fetching total customers count', { companyId, search, error });
            throw error;
        }
    }

    async updateCustomer(
        customerId: string,
        companyId: string,
        updates: { first_name?: string; last_name?: string; phone?: string }
    ): Promise<CustomerWithUserDBInterface | null> {
        try {
            const pool = this.getPool();
            const setParts: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (updates.first_name !== undefined) {
                setParts.push(`first_name = $${paramIndex}`);
                params.push(updates.first_name);
                paramIndex++;
            }
            if (updates.last_name !== undefined) {
                setParts.push(`last_name = $${paramIndex}`);
                params.push(updates.last_name);
                paramIndex++;
            }
            if (updates.phone !== undefined) {
                setParts.push(`phone = $${paramIndex}`);
                params.push(updates.phone);
                paramIndex++;
            }

            setParts.push(`updated_at = NOW()`);

            const query = `
                UPDATE users
                SET ${setParts.join(', ')}
                WHERE user_id = (
                    SELECT user_id FROM customers
                    WHERE customer_id = $${paramIndex}
                      AND company_id = $${paramIndex + 1}
                      AND deleted_at IS NULL
                )
                RETURNING *
            `;
            params.push(customerId, companyId);

            const result = await pool.query(query, params);
            if (result.rows.length === 0) {
                return null;
            }

            // Fetch the updated customer data
            return await this.getCustomerById(customerId, companyId);
        } catch (error) {
            customerLogger.error('Error updating customer', { customerId, companyId, updates, error });
            throw error;
        }
    }

    async softDeleteCustomer(customerId: string, companyId: string): Promise<boolean> {
        try {
            const pool = this.getPool();
            const query = `
                UPDATE customers
                SET deleted_at = NOW()
                WHERE customer_id = $1
                  AND company_id = $2
                  AND deleted_at IS NULL
            `;
            const result = await pool.query(query, [customerId, companyId]);
            return (result.rowCount ?? 0) > 0;
        } catch (error) {
            customerLogger.error('Error soft deleting customer', { customerId, companyId, error });
            throw error;
        }
    }
}