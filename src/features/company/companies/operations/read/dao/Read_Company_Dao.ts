// src/features/company/companies/operations/read/dao/Read_Company_Dao.ts

import { getDatabase } from '@/database/Database_Connection_Manager';
import { CompanyDetailsResponse } from '@/features/company/companies/interfaces/Company_Response.interface';
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';

export class ReadCompanyDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async getCompanyById(companyId: string): Promise<CompanyDetailsResponse | null> {
        const pool = this.getPool();

        try {
            // 🔥 COMPREHENSIVE QUERY WITH DASHBOARD METRICS
            const query = `
                WITH company_base AS (
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
                    WHERE company_id = $1
                ),
                current_month_bookings AS (
                    -- Current month bookings
                    SELECT 
                        COUNT(*) AS total_current_month,
                        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS revenue_current_month,
                        COUNT(*) FILTER (WHERE status = 'completed') AS completed_current_month,
                        COUNT(*) FILTER (WHERE status = 'pending') AS pending_current_month,
                        COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed_current_month,
                        COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled_current_month
                    FROM bookings
                    WHERE company_id = $1
                      AND deleted_at IS NULL
                      AND DATE_TRUNC('month', scheduled_date) = DATE_TRUNC('month', CURRENT_DATE)
                ),
                last_month_bookings AS (
                    -- Last month bookings (for comparison)
                    SELECT 
                        COUNT(*) AS total_last_month,
                        COALESCE(SUM(total_amount) FILTER (WHERE status = 'completed'), 0) AS revenue_last_month
                    FROM bookings
                    WHERE company_id = $1
                      AND deleted_at IS NULL
                      AND DATE_TRUNC('month', scheduled_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
                ),
                current_week_waitlist AS (
                    -- Wait list this week (pending bookings)
                    SELECT COUNT(*) AS waitlist_current_week
                    FROM bookings
                    WHERE company_id = $1
                      AND deleted_at IS NULL
                      AND status = 'pending'
                      AND DATE_TRUNC('week', scheduled_date) = DATE_TRUNC('week', CURRENT_DATE)
                ),
                last_week_waitlist AS (
                    -- Wait list last week
                    SELECT COUNT(*) AS waitlist_last_week
                    FROM bookings
                    WHERE company_id = $1
                      AND deleted_at IS NULL
                      AND status = 'pending'
                      AND DATE_TRUNC('week', scheduled_date) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
                ),
                current_week_active_staff AS (
                    -- Active agents this week (staff with confirmed bookings)
                    SELECT COUNT(DISTINCT b.staff_id) AS active_staff_current_week
                    FROM bookings b
                    WHERE b.company_id = $1
                      AND b.deleted_at IS NULL
                      AND b.staff_id IS NOT NULL
                      AND b.status = 'confirmed'
                      AND DATE_TRUNC('week', b.scheduled_date) = DATE_TRUNC('week', CURRENT_DATE)
                ),
                last_week_active_staff AS (
                    -- Active agents last week
                    SELECT COUNT(DISTINCT b.staff_id) AS active_staff_last_week
                    FROM bookings b
                    WHERE b.company_id = $1
                      AND b.deleted_at IS NULL
                      AND b.staff_id IS NOT NULL
                      AND b.status = 'confirmed'
                      AND DATE_TRUNC('week', b.scheduled_date) = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
                )
                SELECT 
                    -- Company basic info
                    cb.company_id,
                    cb.company_name,
                    cb.slug,
                    cb.email,
                    cb.phone,
                    cb.address,
                    cb.logo_url,
                    cb.subscription_tier,
                    cb.is_active,
                    cb.settings,
                    cb.timezone,
                    cb.currency,
                    cb.created_at,
                    cb.updated_at,
                    
                    -- Dashboard metrics
                    COALESCE(cmb.total_current_month, 0) AS total_bookings,
                    CASE 
                        WHEN COALESCE(lmb.total_last_month, 0) = 0 THEN 0
                        ELSE ROUND(
                            ((COALESCE(cmb.total_current_month, 0)::NUMERIC - COALESCE(lmb.total_last_month, 0)::NUMERIC) 
                            / COALESCE(lmb.total_last_month, 1)::NUMERIC * 100), 
                            1
                        )
                    END AS total_bookings_change_percent,
                    
                    COALESCE(cmb.revenue_current_month, 0) AS revenue,
                    CASE 
                        WHEN COALESCE(lmb.revenue_last_month, 0) = 0 THEN 0
                        ELSE ROUND(
                            ((COALESCE(cmb.revenue_current_month, 0)::NUMERIC - COALESCE(lmb.revenue_last_month, 0)::NUMERIC) 
                            / COALESCE(lmb.revenue_last_month, 1)::NUMERIC * 100), 
                            1
                        )
                    END AS revenue_change_percent,
                    
                    COALESCE(cww.waitlist_current_week, 0) AS wait_list,
                    CASE 
                        WHEN COALESCE(lww.waitlist_last_week, 0) = 0 THEN 0
                        ELSE ROUND(
                            ((COALESCE(cww.waitlist_current_week, 0)::NUMERIC - COALESCE(lww.waitlist_last_week, 0)::NUMERIC) 
                            / COALESCE(lww.waitlist_last_week, 1)::NUMERIC * 100), 
                            1
                        )
                    END AS wait_list_change_percent,
                    
                    COALESCE(cwas.active_staff_current_week, 0) AS active_agents,
                    COALESCE(cwas.active_staff_current_week, 0) - COALESCE(lwas.active_staff_last_week, 0) AS active_agents_change,
                    
                    COALESCE(cmb.completed_current_month, 0) AS completed_bookings,
                    COALESCE(cmb.pending_current_month, 0) AS pending_bookings,
                    COALESCE(cmb.confirmed_current_month, 0) AS confirmed_bookings,
                    COALESCE(cmb.cancelled_current_month, 0) AS cancelled_bookings
                    
                FROM company_base cb
                CROSS JOIN current_month_bookings cmb
                CROSS JOIN last_month_bookings lmb
                CROSS JOIN current_week_waitlist cww
                CROSS JOIN last_week_waitlist lww
                CROSS JOIN current_week_active_staff cwas
                CROSS JOIN last_week_active_staff lwas
            `;

            const result = await pool.query(query, [companyId]);

            if (result.rows.length === 0) {
                return null;
            }

            const row = result.rows[0];

            // 🔥 Structure response with dashboard metrics
            return {
                company_id: row.company_id,
                company_name: row.company_name,
                slug: row.slug,
                email: row.email,
                phone: row.phone,
                address: row.address,
                logo_url: row.logo_url,
                subscription_tier: row.subscription_tier,
                is_active: row.is_active,
                settings: row.settings,
                timezone: row.timezone,
                currency: row.currency,
                created_at: row.created_at,
                updated_at: row.updated_at,

                dashboard_metrics: {
                    total_bookings: parseInt(row.total_bookings),
                    total_bookings_change_percent: parseFloat(row.total_bookings_change_percent),

                    revenue: parseFloat(row.revenue),
                    revenue_change_percent: parseFloat(row.revenue_change_percent),

                    wait_list: parseInt(row.wait_list),
                    wait_list_change_percent: parseFloat(row.wait_list_change_percent),

                    active_agents: parseInt(row.active_agents),
                    active_agents_change: parseInt(row.active_agents_change),

                    completed_bookings: parseInt(row.completed_bookings),
                    pending_bookings: parseInt(row.pending_bookings),
                    confirmed_bookings: parseInt(row.confirmed_bookings),
                    cancelled_bookings: parseInt(row.cancelled_bookings)
                }
            };

        } catch (error) {
            companyLogger.error('Error fetching company by ID', { companyId, error });
            throw error;
        }
    }
}

export const readCompanyDAO = new ReadCompanyDAO();