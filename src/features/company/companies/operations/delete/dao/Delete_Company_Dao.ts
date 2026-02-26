
import { getDatabase } from '@/database/Database_Connection_Manager';
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';

export class DeleteCompanyDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async deleteCompany(companyId: string): Promise<boolean> {
        const pool = this.getPool();

        try {
            // Soft delete the company and deactivate it
            const query = `
                UPDATE companies
                SET deleted_at = NOW(), is_active = FALSE
                WHERE company_id = $1 AND deleted_at IS NULL
            `;

            const result = await pool.query(query, [companyId]);

            return result.rowCount !== null && result.rowCount > 0;

        } catch (error) {
            companyLogger.error('Error deleting company', { companyId, error });
            throw error;
        }
    }
}

export const deleteCompanyDAO = new DeleteCompanyDAO();
