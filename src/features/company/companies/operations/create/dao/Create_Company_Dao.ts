import { getDatabase } from '@/database/Database_Connection_Manager';
import { CreateCompanyInput } from '@/features/company/companies/interfaces/Company_Request.interface';
import { CompanyDetailsResponse } from '@/features/company/companies/interfaces/Company_Response.interface';
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';
import { generateULID } from '@/utilities/id_generator/ULID_Generator';

export class CreateCompanyDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async createCompany(data: CreateCompanyInput): Promise<CompanyDetailsResponse> {
        const pool = this.getPool();

        try {
            const companyId = generateULID();

            // Auto-generate a basic slug if not provided
            let slug = data.slug;
            if (!slug) {
                slug = data.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + companyId.slice(-6);
            }

            const query = `
                INSERT INTO companies (
                    company_id, company_name, slug, email, phone, address, logo_url, 
                    subscription_tier, settings, timezone, currency, is_active, created_at, updated_at
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW(), NOW()
                )
                RETURNING *
            `;

            const values = [
                companyId,
                data.company_name,
                slug,
                data.email || null,
                data.phone || null,
                data.address || null,
                data.logo_url || null,
                data.subscription_tier || 'free',
                null, // settings
                'UTC', // timezone
                'AED'  // currency
            ];

            const result = await pool.query(query, values);
            return result.rows[0] as CompanyDetailsResponse;

        } catch (error: any) {
            // Postgres unique violation code is '23505'
            if (error.code === '23505') {
                companyLogger.warn('Unique constraint violation when creating company', { data, error: error.message });
                // We'll throw a specific instance to let the service handle it cleanly
                throw new Error(`Unique constraint violation: ${error.constraint}`);
            }
            companyLogger.error('Error creating company', { data, error });
            throw error;
        }
    }
}

export const createCompanyDAO = new CreateCompanyDAO();
