// src/features/enquiries/operations/update_status/dao/Update_Enquiry_Status_Dao.ts

import { getDatabase } from '@/database/Database_Connection_Manager';
import { EnquiryRecord, EnquiryStatus } from '@/features/enquiries/interfaces/Enquiry.interface';
import { ENQUIRY_ROW_COLUMNS } from '@/features/enquiries/dao/Enquiry_Row_Columns';

export class UpdateEnquiryStatusDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    /**
     * Updates status and records who acted. The company_id predicate is what
     * stops one tenant's admin from touching another tenant's enquiry; it is
     * omitted only for super admins.
     */
    async updateStatus(
        enquiryId: string,
        companyId: string | null,
        status: EnquiryStatus,
        adminNotes: string | null,
        handledBy: string
    ): Promise<EnquiryRecord | null> {
        const pool = this.getPool();

        const params: unknown[] = [status, adminNotes, handledBy, enquiryId];
        let tenantPredicate = '';

        if (companyId) {
            params.push(companyId);
            tenantPredicate = `AND company_id = $${params.length}`;
        }

        const result = await pool.query(
            `UPDATE service_enquiries
                SET status = $1,
                    admin_notes = COALESCE($2, admin_notes),
                    handled_by = $3
              WHERE enquiry_id = $4
                AND deleted_at IS NULL
                ${tenantPredicate}
            RETURNING ${ENQUIRY_ROW_COLUMNS}`,
            params
        );

        return (result.rows[0] as EnquiryRecord) ?? null;
    }
}

export const updateEnquiryStatusDAO = new UpdateEnquiryStatusDAO();
