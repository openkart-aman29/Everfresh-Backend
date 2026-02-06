// // src/features/bookings/operations/read_all/dao/Read_All_Bookings_DAO.ts
// import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
// import { BookingListResponseInterface } from '@/features/company/bookings/interface/Booking_Filter_Interface';

// interface Filters {
//     company_id: string;
//     page: number;
//     limit: number;
//     sort_by: string;
//     sort_order: 'ASC' | 'DESC';
//     customer_id?: string;
//     service_id?: string;
//     staff_id?: string;
//     status?: string | string[];
//     scheduled_date_from?: Date;
//     scheduled_date_to?: Date;
//     search?: string;
//     payment_status?: 'unpaid' | 'partial' | 'paid';
// }

// /**
//  * DAO: Fetch bookings list with pagination
//  */
// class ReadAllBookingsDAO extends BaseBookingDAO {
//     async readAllBookings(
//         filters: Filters
//     ): Promise<{ success: boolean; data?: BookingListResponseInterface }> {
//         try {
//             const pool = this.getPool();
//             if (!pool) {
//                 return { success: false };
//             }

//             const { page, limit, sort_by, sort_order, company_id } = filters;
//             const offset = (page - 1) * limit;

//             // Build WHERE clause
//             const conditions: string[] = ['b.company_id = $1', 'b.deleted_at IS NULL'];
//             const values: any[] = [company_id];
//             let paramIndex = 2;

//             if (filters.customer_id) {
//                 conditions.push(`b.customer_id = $${paramIndex}`);
//                 values.push(filters.customer_id);
//                 paramIndex++;
//             }

//             if (filters.service_id) {
//                 conditions.push(`b.service_id = $${paramIndex}`);
//                 values.push(filters.service_id);
//                 paramIndex++;
//             }

//             if (filters.staff_id) {
//                 conditions.push(`b.staff_id = $${paramIndex}`);
//                 values.push(filters.staff_id);
//                 paramIndex++;
//             }

//             if (filters.status) {
//                 if (Array.isArray(filters.status)) {
//                     conditions.push(`b.status = ANY($${paramIndex})`);
//                     values.push(filters.status);
//                 } else {
//                     conditions.push(`b.status = $${paramIndex}`);
//                     values.push(filters.status);
//                 }
//                 paramIndex++;
//             }

//             if (filters.scheduled_date_from) {
//                 conditions.push(`b.scheduled_date >= $${paramIndex}`);
//                 values.push(filters.scheduled_date_from);
//                 paramIndex++;
//             }

//             if (filters.scheduled_date_to) {
//                 conditions.push(`b.scheduled_date <= $${paramIndex}`);
//                 values.push(filters.scheduled_date_to);
//                 paramIndex++;
//             }

//             // Default: exclude past bookings (only today and future) when no date filters provided ✅
//             if (!filters.scheduled_date_from && !filters.scheduled_date_to) {
//                 conditions.push('b.scheduled_date >= CURRENT_DATE');
//             }

//             if (filters.search) {
//                 conditions.push(`(
//                     b.booking_number ILIKE $${paramIndex} OR
//                     CONCAT(cu.first_name, ' ', cu.last_name) ILIKE $${paramIndex}
//                 )`);
//                 values.push(`%${filters.search}%`);
//                 paramIndex++;
//             }

//             // Payment status filter (using subquery)
//             if (filters.payment_status) {
//                 const paymentCondition = this.getPaymentStatusCondition(filters.payment_status);
//                 conditions.push(paymentCondition);
//             }

//             const whereClause = conditions.join(' AND ');

//             // Count total records
//             const countQuery = `
//                 SELECT COUNT(b.booking_id) AS total
//                 FROM bookings b
//                 INNER JOIN customers cust ON b.customer_id = cust.customer_id
//                 INNER JOIN users cu ON cust.user_id = cu.user_id
//                 WHERE ${whereClause}
//             `;

//             const countResult = await pool.query(countQuery, values);
//             const total = parseInt(countResult.rows[0].total);

//             // Fetch records
//             const dataQuery = `
//                 SELECT 
//                     b.booking_id,
//                     b.booking_number,
//                     b.status,
//                     b.scheduled_date,
//                     b.scheduled_time_start,
//                     b.scheduled_time_end,
//                     b.service_location,
//                     b.total_amount,
//                     b.created_at,
//                     CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
//                     cu.email AS customer_email,
//                     s.service_name,
//                     s.category AS service_category,
//                     CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
//                     COALESCE(
//                         (
//                             SELECT SUM(p.amount)
//                             FROM payments p
//                             JOIN payment_statuses ps ON p.status = ps.status_code
//                             JOIN payment_types pt ON p.payment_type = pt.type_code
//                             WHERE p.booking_id = b.booking_id
//                               AND ps.is_completed = TRUE
//                               AND pt.affects_balance = 'increase'
//                               AND p.deleted_at IS NULL
//                         ),
//                         0
//                     ) AS paid_amount
//                 FROM bookings b
//                 INNER JOIN customers cust ON b.customer_id = cust.customer_id
//                 INNER JOIN users cu ON cust.user_id = cu.user_id
//                 INNER JOIN services s ON b.service_id = s.service_id
//                 LEFT JOIN staff stf ON b.staff_id = stf.staff_id
//                 LEFT JOIN users su ON stf.user_id = su.user_id
//                 WHERE ${whereClause}
//                 ORDER BY b.${sort_by} ${sort_order}
//                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
//             `;

//             values.push(limit, offset);
//             const dataResult = await pool.query(dataQuery, values);

//             const totalPages = Math.ceil(total / limit);

//             return {
//                 success: true,
//                 data: {
//                     bookings: dataResult.rows,
//                     total,
//                     page,
//                     limit,
//                     total_pages: totalPages
//                 }
//             };

//         } catch (error) {
//             this.logError('readAllBookings', error);
//             return { success: false };
//         }
//     }

//     private getPaymentStatusCondition(status: string): string {
//         switch (status) {
//             case 'unpaid':
//                 return `NOT EXISTS(
//                     SELECT 1 FROM payments p
//                     JOIN payment_statuses ps ON p.status = ps.status_code
//                     WHERE p.booking_id = b.booking_id
//                       AND ps.is_completed = TRUE
//                       AND p.deleted_at IS NULL
//                 )`;
//             case 'partial':
//                 return `(
//                     SELECT COALESCE(SUM(p.amount), 0)
//                     FROM payments p
//                     JOIN payment_statuses ps ON p.status = ps.status_code
//                     JOIN payment_types pt ON p.payment_type = pt.type_code
//                     WHERE p.booking_id = b.booking_id
//                       AND ps.is_completed = TRUE
//                       AND pt.affects_balance = 'increase'
//                       AND p.deleted_at IS NULL
//                 ) BETWEEN 0.01 AND b.total_amount - 0.01`;
//             case 'paid':
//                 return `(
//                     SELECT COALESCE(SUM(p.amount), 0)
//                     FROM payments p
//                     JOIN payment_statuses ps ON p.status = ps.status_code
//                     JOIN payment_types pt ON p.payment_type = pt.type_code
//                     WHERE p.booking_id = b.booking_id
//                       AND ps.is_completed = TRUE
//                       AND pt.affects_balance = 'increase'
//                       AND p.deleted_at IS NULL
//                 ) >= b.total_amount`;
//             default:
//                 return '1=1';
//         }
//     }
// }

// export async function readAllBookingsDAO(
//     filters: Filters
// ): Promise<{ success: boolean; data?: BookingListResponseInterface }> {
//     const dao = new ReadAllBookingsDAO();
//     return dao.readAllBookings(filters);
// }

// src/features/bookings/operations/read_all/dao/Read_All_Bookings_DAO.ts
// src/features/bookings/operations/read_all/dao/Read_All_Bookings_DAO.ts
// import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
// import { BookingListResponseInterface } from '@/features/company/bookings/interface/Booking_Filter_Interface';
// import { bookingLogger } from '@/features/company/bookings/logger/Booking_Logger';

// interface Filters {
//     company_id: string;
//     page: number;
//     limit: number;
//     sort_by: string;
//     sort_order: 'ASC' | 'DESC';
//     customer_id?: string;
//     service_id?: string;
//     staff_id?: string;
//     status?: string | string[];
//     scheduled_date_from?: Date;
//     scheduled_date_to?: Date;
//     search?: string;
//     payment_status?: 'unpaid' | 'partial' | 'paid';
// }

// /**
//  * DAO: Fetch bookings list with pagination (OPTIMIZED)
//  */
// class ReadAllBookingsDAO extends BaseBookingDAO {
//     async readAllBookings(
//         filters: Filters
//     ): Promise<{ success: boolean; data?: BookingListResponseInterface }> {
//         try {
//             const pool = this.getPool();
//             if (!pool) {
//                 return { success: false };
//             }

//             const { page, limit, sort_by, sort_order, company_id } = filters;
//             const offset = (page - 1) * limit;

//             // Build WHERE conditions
//             const conditions: string[] = ['b.company_id = $1', 'b.deleted_at IS NULL'];
//             const values: any[] = [company_id];
//             let paramIndex = 2;

//             if (filters.customer_id) {
//                 conditions.push(`b.customer_id = $${paramIndex}`);
//                 values.push(filters.customer_id);
//                 paramIndex++;
//             }

//             if (filters.service_id) {
//                 conditions.push(`b.service_id = $${paramIndex}`);
//                 values.push(filters.service_id);
//                 paramIndex++;
//             }

//             if (filters.staff_id) {
//                 conditions.push(`b.staff_id = $${paramIndex}`);
//                 values.push(filters.staff_id);
//                 paramIndex++;
//             }

//             if (filters.status) {
//                 if (Array.isArray(filters.status)) {
//                     conditions.push(`b.status = ANY($${paramIndex})`);
//                     values.push(filters.status);
//                 } else {
//                     conditions.push(`b.status = $${paramIndex}`);
//                     values.push(filters.status);
//                 }
//                 paramIndex++;
//             }

//             if (filters.scheduled_date_from) {
//                 conditions.push(`b.scheduled_date >= $${paramIndex}`);
//                 values.push(filters.scheduled_date_from);
//                 paramIndex++;
//             }

//             if (filters.scheduled_date_to) {
//                 conditions.push(`b.scheduled_date <= $${paramIndex}`);
//                 values.push(filters.scheduled_date_to);
//                 paramIndex++;
//             }

//             // Default: only today and future bookings
//             if (!filters.scheduled_date_from && !filters.scheduled_date_to) {
//                 conditions.push('b.scheduled_date >= CURRENT_DATE');
//             }

//             if (filters.search) {
//                 conditions.push(`(
//                     b.booking_number ILIKE $${paramIndex} OR
//                     cu.first_name ILIKE $${paramIndex} OR
//                     cu.last_name ILIKE $${paramIndex} OR
//                     CONCAT(cu.first_name, ' ', cu.last_name) ILIKE $${paramIndex}
//                 )`);
//                 values.push(`%${filters.search}%`);
//                 paramIndex++;
//             }

//             const whereClause = conditions.join(' AND ');

//             // 🔥 OPTIMIZED QUERY WITH CTE AND LEFT JOIN
//             const query = `
//                 WITH payment_aggregates AS (
//                     -- Pre-aggregate payments ONCE for all bookings
//                     SELECT 
//                         p.booking_id,
//                         COALESCE(SUM(p.amount) FILTER (
//                             WHERE ps.is_completed = TRUE 
//                             AND pt.affects_balance = 'increase'
//                         ), 0) AS paid_amount
//                     FROM payments p
//                     INNER JOIN payment_statuses ps ON p.status = ps.status_code
//                     INNER JOIN payment_types pt ON p.payment_type = pt.type_code
//                     WHERE p.deleted_at IS NULL
//                     GROUP BY p.booking_id
//                 ),
//                 filtered_bookings AS (
//                     -- Filter bookings first, then join
//                     SELECT 
//                         b.booking_id,
//                         b.booking_number,
//                         b.status,
//                         b.scheduled_date,
//                         b.scheduled_time_start,
//                         b.scheduled_time_end,
//                         b.service_location,
//                         b.total_amount,
//                         b.created_at,
//                         b.customer_id,
//                         b.service_id,
//                         b.staff_id,
//                         COALESCE(pa.paid_amount, 0) AS paid_amount,
//                         -- Calculate payment status once
//                         CASE 
//                             WHEN COALESCE(pa.paid_amount, 0) = 0 THEN 'unpaid'
//                             WHEN COALESCE(pa.paid_amount, 0) < b.total_amount THEN 'partial'
//                             ELSE 'paid'
//                         END AS payment_status
//                     FROM bookings b
//                     LEFT JOIN payment_aggregates pa ON b.booking_id = pa.booking_id
//                     WHERE ${whereClause}
//                 ),
//                 total_count AS (
//                     -- Count total AFTER filtering
//                     SELECT COUNT(*) AS total FROM filtered_bookings
//                     ${filters.payment_status ? `WHERE payment_status = '${filters.payment_status}'` : ''}
//                 )
//                 SELECT 
//                     fb.booking_id,
//                     fb.booking_number,
//                     fb.status,
//                     fb.scheduled_date,
//                     fb.scheduled_time_start,
//                     fb.scheduled_time_end,
//                     fb.service_location,
//                     fb.total_amount,
//                     fb.created_at,
//                     fb.paid_amount,
//                     fb.payment_status,
//                     -- Customer info
//                     CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
//                     cu.email AS customer_email,
//                     -- Service info
//                     s.service_name,
//                     s.category AS service_category,
//                     -- Staff info
//                     CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
//                     -- Total count (same for all rows)
//                     tc.total
//                 FROM filtered_bookings fb
//                 INNER JOIN customers cust ON fb.customer_id = cust.customer_id
//                 INNER JOIN users cu ON cust.user_id = cu.user_id
//                 INNER JOIN services s ON fb.service_id = s.service_id
//                 LEFT JOIN staff stf ON fb.staff_id = stf.staff_id
//                 LEFT JOIN users su ON stf.user_id = su.user_id
//                 CROSS JOIN total_count tc
//                 ${filters.payment_status ? `WHERE fb.payment_status = '${filters.payment_status}'` : ''}
//                 ORDER BY fb.${this.sanitizeSortColumn(sort_by)} ${sort_order}
//                 LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
//             `;

//             values.push(limit, offset);

//             const startTime = Date.now();
//             const result = await pool.query(query, values);
//             const queryTime = Date.now() - startTime;

//             bookingLogger.info('readAllBookings', `Query executed in ${queryTime}ms`);

//             const total = result.rows.length > 0 ? parseInt(result.rows[0].total) : 0;
//             const totalPages = Math.ceil(total / limit);

//             // Remove 'total' from each row (it was just for counting)
//             const bookings = result.rows.map(({ total, ...booking }) => booking);

//             return {
//                 success: true,
//                 data: {
//                     bookings,
//                     total,
//                     page,
//                     limit,
//                     total_pages: totalPages
//                 }
//             };

//         } catch (error) {
//             this.logError('readAllBookings', error);
//             return { success: false };
//         }
//     }

//     /**
//      * Sanitize sort column to prevent SQL injection
//      */
//     private sanitizeSortColumn(column: string): string {
//         const allowedColumns = [
//             'booking_number',
//             'status',
//             'scheduled_date',
//             'scheduled_time_start',
//             'total_amount',
//             'created_at'
//         ];

//         return allowedColumns.includes(column) ? column : 'created_at';
//     }
// }

// export async function readAllBookingsDAO(
//     filters: Filters
// ): Promise<{ success: boolean; data?: BookingListResponseInterface }> {
//     const dao = new ReadAllBookingsDAO();
//     return dao.readAllBookings(filters);
// }



// src/features/bookings/operations/read_all/dao/Read_All_Bookings_DAO.ts
import { BaseBookingDAO } from '@/features/company/bookings/database/dao/Base_Booking_DAO';
import { BookingListResponseInterface } from '@/features/company/bookings/interface/Booking_Filter_Interface';

interface Filters {
    company_id: string;
    page: number;
    limit: number;
    sort_by: string;
    sort_order: 'ASC' | 'DESC';
    customer_id?: string;
    service_id?: string;
    staff_id?: string;
    status?: string | string[];
    search?: string;
}

/**
 * DAO: Fetch bookings list (SIMPLIFIED - NO PAYMENTS)
 * Shows bookings from today to next 6 days
 */
class ReadAllBookingsDAO extends BaseBookingDAO {
    async readAllBookings(
        filters: Filters
    ): Promise<{ success: boolean; data?: BookingListResponseInterface }> {
        try {
            const pool = this.getPool();
            if (!pool) {
                return { success: false };
            }

            const { page, limit, sort_by, sort_order, company_id } = filters;
            const offset = (page - 1) * limit;

            // Build WHERE conditions
            const conditions: string[] = [
                'b.company_id = $1',
                'b.deleted_at IS NULL',
                'b.scheduled_date >= CURRENT_DATE', // From today
                'b.scheduled_date <= CURRENT_DATE + INTERVAL \'6 days\'' // Next 6 days
            ];
            const values: any[] = [company_id];
            let paramIndex = 2;

            // Optional filters
            if (filters.customer_id) {
                conditions.push(`b.customer_id = $${paramIndex}`);
                values.push(filters.customer_id);
                paramIndex++;
            }

            if (filters.service_id) {
                conditions.push(`b.service_id = $${paramIndex}`);
                values.push(filters.service_id);
                paramIndex++;
            }

            if (filters.staff_id) {
                conditions.push(`b.staff_id = $${paramIndex}`);
                values.push(filters.staff_id);
                paramIndex++;
            }

            if (filters.status) {
                if (Array.isArray(filters.status)) {
                    conditions.push(`b.status = ANY($${paramIndex})`);
                    values.push(filters.status);
                } else {
                    conditions.push(`b.status = $${paramIndex}`);
                    values.push(filters.status);
                }
                paramIndex++;
            }

            if (filters.search) {
                conditions.push(`(
                    b.booking_number ILIKE $${paramIndex} OR
                    cu.first_name ILIKE $${paramIndex} OR
                    cu.last_name ILIKE $${paramIndex} OR
                    CONCAT(cu.first_name, ' ', cu.last_name) ILIKE $${paramIndex}
                )`);
                values.push(`%${filters.search}%`);
                paramIndex++;
            }

            const whereClause = conditions.join(' AND ');

            // 🔥 SINGLE OPTIMIZED QUERY
            const query = `
                WITH filtered_bookings AS (
                    SELECT 
                        b.booking_id,
                        b.booking_number,
                        b.status,
                        b.scheduled_date,
                        b.scheduled_time_start,
                        b.scheduled_time_end,
                        b.service_location,
                        b.total_amount,
                        b.special_instructions,
                        b.created_at,
                        b.customer_id,
                        b.service_id,
                        b.staff_id
                    FROM bookings b
                    INNER JOIN customers cust ON b.customer_id = cust.customer_id
                    INNER JOIN users cu ON cust.user_id = cu.user_id
                    WHERE ${whereClause}
                ),
                total_count AS (
                    SELECT COUNT(*) AS total FROM filtered_bookings
                )
                SELECT 
                    fb.booking_id,
                    fb.booking_number,
                    fb.status,
                    fb.scheduled_date,
                    fb.scheduled_time_start,
                    fb.scheduled_time_end,
                    fb.service_location,
                    fb.total_amount,
                    fb.special_instructions,
                    fb.created_at,
                    
                    -- Customer info
                    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
                    cu.email AS customer_email,
                    cu.phone AS customer_phone,
                    
                    -- Service info
                    s.service_name,
                    s.category AS service_category,
                    
                    -- Staff info (can be NULL)
                    CASE 
                        WHEN fb.staff_id IS NOT NULL 
                        THEN CONCAT(su.first_name, ' ', su.last_name)
                        ELSE NULL
                    END AS staff_name,
                    
                    -- Total count
                    tc.total
                FROM filtered_bookings fb
                INNER JOIN customers cust ON fb.customer_id = cust.customer_id
                INNER JOIN users cu ON cust.user_id = cu.user_id
                INNER JOIN services s ON fb.service_id = s.service_id
                LEFT JOIN staff stf ON fb.staff_id = stf.staff_id
                LEFT JOIN users su ON stf.user_id = su.user_id
                CROSS JOIN total_count tc
                ORDER BY fb.${this.sanitizeSortColumn(sort_by)} ${sort_order}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            values.push(limit, offset);
            
            const startTime = Date.now();
            const result = await pool.query(query, values);
            const queryTime = Date.now() - startTime;

            // ('readAllBookings', `Query executed in ${queryTime}ms, returned ${result.rows.length} rows`);

            const total = result.rows.length > 0 ? parseInt(result.rows[0].total) : 0;
            const totalPages = Math.ceil(total / limit);

            // Remove 'total' field from each row
            const bookings = result.rows.map(({ total, ...booking }) => booking);

            return {
                success: true,
                data: {
                    bookings,
                    total,
                    page,
                    limit,
                    total_pages: totalPages
                }
            };

        } catch (error) {
            this.logError('readAllBookings', error);
            return { success: false };
        }
    }

    /**
     * Sanitize sort column to prevent SQL injection
     */
    private sanitizeSortColumn(column: string): string {
        const allowedColumns = [
            'booking_number',
            'status',
            'scheduled_date',
            'scheduled_time_start',
            'total_amount',
            'created_at'
        ];

        return allowedColumns.includes(column) ? column : 'scheduled_date';
    }
}

export async function readAllBookingsDAO(
    filters: Filters
): Promise<{ success: boolean; data?: BookingListResponseInterface }> {
    const dao = new ReadAllBookingsDAO();
    return dao.readAllBookings(filters);
}