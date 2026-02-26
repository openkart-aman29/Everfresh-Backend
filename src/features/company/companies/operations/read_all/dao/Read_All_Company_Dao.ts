
import { getDatabase } from '@/database/Database_Connection_Manager';
import { CompanyDetailsResponse, PaginatedCompanyResponse } from '@/features/company/companies/interfaces/Company_Response.interface';
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';
import { ReadAllCompaniesInput } from '@/features/company/companies/interfaces/Company_Request.interface';

export class ReadAllCompanyDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async getAllCompanies(input: ReadAllCompaniesInput): Promise<PaginatedCompanyResponse> {
        const pool = this.getPool();
        const { limit, offset, search, sortBy, sortOrder, is_active, subscription_tier } = input;

        try {
            let query = `
                SELECT 
                    company_id,
                    company_name,
                    slug,
                    email,
                    phone,
                    address,
                    logo_url,
                    subscription_tier,
                    is_active,
                    settings,
                    timezone,
                    currency,
                    created_at,
                    updated_at
                FROM companies
                WHERE 1=1
            `;
            const params: any[] = [];
            let paramCounter = 1;

            if (search) {
                query += ` AND (company_name ILIKE $${paramCounter} OR email ILIKE $${paramCounter} OR slug ILIKE $${paramCounter})`;
                params.push(`%${search}%`);
                paramCounter++;
            }

            if (is_active !== undefined) {
                query += ` AND is_active = $${paramCounter}`;
                params.push(is_active);
                paramCounter++;
            }

            if (subscription_tier) {
                query += ` AND subscription_tier = $${paramCounter}`;
                params.push(subscription_tier);
                paramCounter++;
            }

            // Count query for pagination meta
            const countQuery = `SELECT COUNT(*) FROM (${query}) AS total`;
            const countResult = await pool.query(countQuery, params);
            const total = parseInt(countResult.rows[0].count, 10);

            // Add sorting and pagination
            query += ` ORDER BY ${sortBy} ${sortOrder} LIMIT $${paramCounter} OFFSET $${paramCounter + 1}`;
            params.push(limit, offset);

            const result = await pool.query(query, params);

            return {
                data: result.rows as CompanyDetailsResponse[],
                pagination: {
                    total,
                    page: input.page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            companyLogger.error('Error fetching all companies', { input, error });
            throw error;
        }
    }
}

export const readAllCompanyDAO = new ReadAllCompanyDAO();
