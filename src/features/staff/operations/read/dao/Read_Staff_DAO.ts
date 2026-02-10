// // src/features/staff/operations/read_single_staff/dao/Read_Single_Staff_DAO.ts
// import { StaffDAO } from '@/features/staff/database/dao/Staff_DAO';
// import { StaffWithUserDBInterface } from '@/features/staff/interfaces/Staff_DB.interface';

// /**
//  * DAO: Fetch single staff with full details
//  */
// export class ReadStaffDAO {
//     private staffDAO = new StaffDAO();

//     async getStaffById(
//         staffId: string,
//         companyId: string
//     ): Promise<StaffWithUserDBInterface | null> {
//         return await this.staffDAO.getStaffById(staffId, companyId);
//     }
// }


// src/features/staff/operations/read/dao/Read_Staff_DAO.ts

import { getDatabase } from '@/database/Database_Connection_Manager';
import { staffLogger } from '@/features/staff/logger/Staff_Logger';

export interface StaffWithMetricsDB {
    // Staff basic info
    staff_id: string;
    company_id: string;
    user_id: string;
    is_available: boolean;
    skills: string[];
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    
    // User info
    email: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    
    // Work metrics
    total_hours_worked: number;
    current_month_hours: number;
}

export interface FirstConfirmedBookingDB {
    booking_id: string;
    booking_number: string;
    status: string;
    scheduled_date: Date;
    scheduled_time_start: string;
    scheduled_time_end: string | null;
    service_location: string;
    customer_name: string;
    customer_phone: string | null;
    service_name: string;
    service_category: string;
    total_amount: number;
    hours_scheduled: number;
}

export class ReadStaffDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            staffLogger.error('Database pool not available');
            throw new Error('Database pool not available');
        }
        return pool;
    }

    /**
     * Get staff by ID with work metrics
     */
    async getStaffById(
        staffId: string,
        companyId: string
    ): Promise<StaffWithMetricsDB | null> {
        try {
            const pool = this.getPool();
            
            const query = `
                WITH staff_hours AS (
                    -- Calculate total hours worked (completed bookings)
                    SELECT 
                        COALESCE(
                            SUM(
                                EXTRACT(EPOCH FROM (
                                    COALESCE(b.actual_end_time, (b.scheduled_date + b.scheduled_time_end::TIME)) - 
                                    COALESCE(b.actual_start_time, (b.scheduled_date + b.scheduled_time_start::TIME))
                                )) / 3600.0
                            ) FILTER (WHERE b.status = 'completed'),
                            0
                        ) AS total_hours_worked,
                        
                        -- Current month hours (completed bookings)
                        COALESCE(
                            SUM(
                                EXTRACT(EPOCH FROM (
                                    COALESCE(b.actual_end_time, (b.scheduled_date + b.scheduled_time_end::TIME)) - 
                                    COALESCE(b.actual_start_time, (b.scheduled_date + b.scheduled_time_start::TIME))
                                )) / 3600.0
                            ) FILTER (
                                WHERE b.status = 'completed' 
                                AND DATE_TRUNC('month', b.scheduled_date) = DATE_TRUNC('month', CURRENT_DATE)
                            ),
                            0
                        ) AS current_month_hours
                    FROM bookings b
                    WHERE b.staff_id = $1
                      AND b.company_id = $2
                      AND b.deleted_at IS NULL
                )
                SELECT
                    s.staff_id,
                    s.company_id,
                    s.user_id,
                    s.is_available,
                    s.skills,
                    s.created_at,
                    s.updated_at,
                    s.deleted_at,
                    u.email,
                    u.first_name,
                    u.last_name,
                    u.phone,
                    u.is_active,
                    sh.total_hours_worked,
                    sh.current_month_hours
                FROM staff s
                INNER JOIN users u ON s.user_id = u.user_id
                CROSS JOIN staff_hours sh
                WHERE s.staff_id = $1
                  AND s.company_id = $2
                  AND s.deleted_at IS NULL
                  AND u.deleted_at IS NULL
            `;
            
            const result = await pool.query(query, [staffId, companyId]);
            return result.rows.length > 0 ? result.rows[0] : null;
            
        } catch (error) {
            staffLogger.error('Error fetching staff by ID', { staffId, companyId, error });
            throw error;
        }
    }

    /**
     * Get first confirmed booking for staff
     */
    async getFirstConfirmedBooking(
        staffId: string,
        companyId: string
    ): Promise<FirstConfirmedBookingDB | null> {
        try {
            const pool = this.getPool();
            
            const query = `
                SELECT 
                    b.booking_id,
                    b.booking_number,
                    b.status,
                    b.scheduled_date,
                    b.scheduled_time_start,
                    b.scheduled_time_end,
                    b.service_location,
                    b.total_amount,
                    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
                    cu.phone AS customer_phone,
                    s.service_name,
                    s.category AS service_category,
                    -- Calculate scheduled hours
                    COALESCE(
                        EXTRACT(EPOCH FROM (
                            COALESCE(
                                (b.scheduled_date + b.scheduled_time_end::TIME),
                                (b.scheduled_date + b.scheduled_time_start::TIME + INTERVAL '2 hours')
                            ) - 
                            (b.scheduled_date + b.scheduled_time_start::TIME)
                        )) / 3600.0,
                        2.0
                    ) AS hours_scheduled
                FROM bookings b
                INNER JOIN customers cust ON b.customer_id = cust.customer_id
                INNER JOIN users cu ON cust.user_id = cu.user_id
                INNER JOIN services s ON b.service_id = s.service_id
                WHERE b.staff_id = $1
                  AND b.company_id = $2
                  AND b.status = 'confirmed'
                  AND b.deleted_at IS NULL
                  AND b.scheduled_date >= CURRENT_DATE
                ORDER BY b.scheduled_date ASC, b.scheduled_time_start ASC
                LIMIT 1
            `;
            
            const result = await pool.query(query, [staffId, companyId]);
            return result.rows.length > 0 ? result.rows[0] : null;
            
        } catch (error) {
            staffLogger.error('Error fetching first confirmed booking', { staffId, companyId, error });
            throw error;
        }
    }
}