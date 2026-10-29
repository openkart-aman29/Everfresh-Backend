// src/features/services/operations/read_all/dao/Read_All_Services_Dao.ts

import { getDatabase } from '@/database/Database_Connection_Manager';

export interface ServiceListItem {
    service_id: string;
    company_id: string;
    service_name: string;
    category: string | null;
    subcategory: string | null;
    description: string | null;
    price: string;
    currency: string | null;
    pricing_type: string;
    duration_minutes: number | null;
    requires_quote: boolean;
}

export class ReadAllServicesDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    /** Active catalogue for one tenant, ordered for display in a picker. */
    async listServices(companyId: string): Promise<ServiceListItem[]> {
        const pool = this.getPool();

        const result = await pool.query(
            `SELECT service_id, company_id, service_name, category, subcategory,
                    description, price, currency, pricing_type, duration_minutes,
                    requires_quote
               FROM services
              WHERE company_id = $1
                AND is_active = TRUE
                AND deleted_at IS NULL
              ORDER BY display_order NULLS LAST, category NULLS LAST, service_name`,
            [companyId]
        );

        return result.rows as ServiceListItem[];
    }
}

export const readAllServicesDAO = new ReadAllServicesDAO();
