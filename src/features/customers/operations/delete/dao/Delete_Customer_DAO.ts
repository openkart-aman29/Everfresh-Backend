// src/features/customers/operations/delete_customer/dao/Delete_Customer_DAO.ts
import { BaseCustomerDAO } from '@/features/customers/database/dao/Base_Customer_DAO';

/**
 * DAO: Soft delete customer and associated user
 */
class DeleteCustomerDAO extends BaseCustomerDAO {
    async softDeleteCustomer(
        customerId: string,
        companyId: string
    ): Promise<{ success: boolean; deleted?: boolean }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }

            // First, get the user_id for the customer
            const getUserQuery = `
                SELECT user_id
                FROM customers
                WHERE customer_id = $1
                  AND company_id = $2
                  AND deleted_at IS NULL
            `;

            const userResult = await pool.query(getUserQuery, [customerId, companyId]);

            if (userResult.rows.length === 0) {
                // Customer not found or already deleted
                return { success: true, deleted: false };
            }

            const userId = userResult.rows[0].user_id;

            // Start transaction for atomic operation
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Soft delete customer
                const deleteCustomerQuery = `
                    UPDATE customers
                    SET deleted_at = NOW()
                    WHERE customer_id = $1
                      AND company_id = $2
                      AND deleted_at IS NULL
                `;

                const customerResult = await client.query(deleteCustomerQuery, [customerId, companyId]);

                // Soft delete user (optional but recommended)
                const deleteUserQuery = `
                    UPDATE users
                    SET deleted_at = NOW()
                    WHERE user_id = $1
                      AND deleted_at IS NULL
                `;

                await client.query(deleteUserQuery, [userId]);

                await client.query('COMMIT');

                return {
                    success: true,
                    deleted: (customerResult.rowCount ?? 0) > 0
                };

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            this.logError('softDeleteCustomer', error);
            return { success: false };
        }
    }
}

export async function softDeleteCustomerDAO(
    customerId: string,
    companyId: string
): Promise<{ success: boolean; deleted?: boolean }> {
    const dao = new DeleteCustomerDAO();
    return dao.softDeleteCustomer(customerId, companyId);
}