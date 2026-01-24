import { getDatabase } from '@/database/Database_Connection_Manager';
import { customerLogger } from '@/features/customers/logger/Customer_Logger';

export class CheckCustomerExistDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            customerLogger.error('Database pool not available');
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async checkCustomerExist(customerId: string, companyId: string): Promise<{ exists: boolean }> {
        try {
            const pool = this.getPool();
            const query = `
                SELECT customer_id
                FROM customers
                WHERE customer_id = $1
                  AND company_id = $2
                  AND deleted_at IS NULL
            `;
            const result = await pool.query(query, [customerId, companyId]);
            return { exists: result.rows.length > 0 };
        } catch (error) {
            customerLogger.error('Error checking customer existence', { customerId, companyId, error });
            return { exists: false };
        }
    }
}

export const checkCustomerExistDAO = new CheckCustomerExistDAO().checkCustomerExist.bind(new CheckCustomerExistDAO());