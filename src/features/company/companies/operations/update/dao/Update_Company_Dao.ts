
import { getDatabase } from '@/database/Database_Connection_Manager';
import { UpdateCompanyInput } from '@/features/company/companies/interfaces/Company_Request.interface';
import { CompanyDetailsResponse } from '@/features/company/companies/interfaces/Company_Response.interface';
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';

export class UpdateCompanyDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async updateCompany(companyId: string, data: UpdateCompanyInput): Promise<CompanyDetailsResponse | null> {
        const pool = this.getPool();

        const fields: string[] = [];
        const values: any[] = [];
        let paramCounter = 1;

        if (data.company_name !== undefined) {
            fields.push(`company_name = $${paramCounter}`);
            values.push(data.company_name);
            paramCounter++;
        }
        if (data.slug !== undefined) {
            fields.push(`slug = $${paramCounter}`);
            values.push(data.slug);
            paramCounter++;
        }
        if (data.email !== undefined) {
            fields.push(`email = $${paramCounter}`);
            values.push(data.email);
            paramCounter++;
        }
        if (data.phone !== undefined) {
            fields.push(`phone = $${paramCounter}`);
            values.push(data.phone);
            paramCounter++;
        }
        if (data.address !== undefined) {
            fields.push(`address = $${paramCounter}`);
            values.push(data.address);
            paramCounter++;
        }
        if (data.logo_url !== undefined) {
            fields.push(`logo_url = $${paramCounter}`);
            values.push(data.logo_url);
            paramCounter++;
        }
        if (data.subscription_tier !== undefined) {
            fields.push(`subscription_tier = $${paramCounter}`);
            values.push(data.subscription_tier);
            paramCounter++;
        }
        if (data.is_active !== undefined) {
            fields.push(`is_active = $${paramCounter}`);
            values.push(data.is_active);
            paramCounter++;
        }

        if (fields.length === 0) {
            return null; // Nothing to update
        }

        try {
            values.push(companyId);
            const query = `
                UPDATE companies
                SET ${fields.join(', ')}, updated_at = NOW()
                WHERE company_id = $${paramCounter}
                RETURNING *
            `;

            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return null;
            }

            return result.rows[0] as CompanyDetailsResponse;

        } catch (error) {
            companyLogger.error('Error updating company', { companyId, data, error });
            throw error;
        }
    }
}

export const updateCompanyDAO = new UpdateCompanyDAO();
