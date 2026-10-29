// src/features/enquiries/operations/read_all/dao/Read_All_Enquiries_Dao.ts

import { getDatabase } from '@/database/Database_Connection_Manager';
import { EnquiryRecord, EnquiryStatus } from '@/features/enquiries/interfaces/Enquiry.interface';
import { ENQUIRY_ROW_COLUMNS } from '@/features/enquiries/dao/Enquiry_Row_Columns';

export class ReadAllEnquiriesDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    /**
     * Tenant-scoped list. `companyId` is null only for super admins, who see
     * every tenant - mirroring how the admin/company DAOs drop the filter.
     */
    async listEnquiries(
        companyId: string | null,
        status: EnquiryStatus | undefined,
        page: number,
        limit: number
    ): Promise<{ rows: EnquiryRecord[]; total: number }> {
        const pool = this.getPool();

        const conditions: string[] = ['deleted_at IS NULL'];
        const params: unknown[] = [];

        if (companyId) {
            params.push(companyId);
            conditions.push(`company_id = $${params.length}`);
        }

        if (status) {
            params.push(status);
            conditions.push(`status = $${params.length}`);
        }

        const where = conditions.join(' AND ');

        const totalResult = await pool.query(
            `SELECT COUNT(*)::int AS total FROM service_enquiries WHERE ${where}`,
            params
        );

        params.push(limit, (page - 1) * limit);

        const rowsResult = await pool.query(
            `SELECT ${ENQUIRY_ROW_COLUMNS}
               FROM service_enquiries
              WHERE ${where}
              ORDER BY created_at DESC
              LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        return {
            rows: rowsResult.rows as EnquiryRecord[],
            total: totalResult.rows[0].total as number,
        };
    }
}

export const readAllEnquiriesDAO = new ReadAllEnquiriesDAO();
