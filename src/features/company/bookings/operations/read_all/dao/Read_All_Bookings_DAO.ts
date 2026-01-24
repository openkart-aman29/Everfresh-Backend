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
    scheduled_date_from?: Date;
    scheduled_date_to?: Date;
    search?: string;
    payment_status?: 'unpaid' | 'partial' | 'paid';
}

/**
 * DAO: Fetch bookings list with pagination
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
            
            // Build WHERE clause
            const conditions: string[] = ['b.company_id = $1', 'b.deleted_at IS NULL'];
            const values: any[] = [company_id];
            let paramIndex = 2;
            
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
            
            if (filters.scheduled_date_from) {
                conditions.push(`b.scheduled_date >= $${paramIndex}`);
                values.push(filters.scheduled_date_from);
                paramIndex++;
            }
            
            if (filters.scheduled_date_to) {
                conditions.push(`b.scheduled_date <= $${paramIndex}`);
                values.push(filters.scheduled_date_to);
                paramIndex++;
            }
            
            if (filters.search) {
                conditions.push(`(
                    b.booking_number ILIKE $${paramIndex} OR
                    CONCAT(cu.first_name, ' ', cu.last_name) ILIKE $${paramIndex}
                )`);
                values.push(`%${filters.search}%`);
                paramIndex++;
            }
            
            // Payment status filter (using subquery)
            if (filters.payment_status) {
                const paymentCondition = this.getPaymentStatusCondition(filters.payment_status);
                conditions.push(paymentCondition);
            }
            
            const whereClause = conditions.join(' AND ');
            
            // Count total records
            const countQuery = `
                SELECT COUNT(DISTINCT b.booking_id) AS total
                FROM bookings b
                INNER JOIN customers cust ON b.customer_id = cust.customer_id
                INNER JOIN users cu ON cust.user_id = cu.user_id
                WHERE ${whereClause}
            `;
            
            const countResult = await pool.query(countQuery, values);
            const total = parseInt(countResult.rows[0].total);
            
            // Fetch records
            const dataQuery = `
                SELECT 
                    b.booking_id,
                    b.booking_number,
                    b.status,
                    b.scheduled_date,
                    b.scheduled_time_start,
                    b.scheduled_time_end,
                    b.service_location,
                    b.total_amount,
                    b.created_at,
                    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
                    cu.email AS customer_email,
                    s.service_name,
                    s.category AS service_category,
                    CONCAT(su.first_name, ' ', su.last_name) AS staff_name,
                    COALESCE(
                        (
                            SELECT SUM(p.amount)
                            FROM payments p
                            JOIN payment_statuses ps ON p.status = ps.status_code
                            JOIN payment_types pt ON p.payment_type = pt.type_code
                            WHERE p.booking_id = b.booking_id
                              AND ps.is_completed = TRUE
                              AND pt.affects_balance = 'increase'
                              AND p.deleted_at IS NULL
                        ),
                        0
                    ) AS paid_amount
                FROM bookings b
                INNER JOIN customers cust ON b.customer_id = cust.customer_id
                INNER JOIN users cu ON cust.user_id = cu.user_id
                INNER JOIN services s ON b.service_id = s.service_id
                LEFT JOIN staff stf ON b.staff_id = stf.staff_id
                LEFT JOIN users su ON stf.user_id = su.user_id
                WHERE ${whereClause}
                ORDER BY b.${sort_by} ${sort_order}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;
            
            values.push(limit, offset);
            const dataResult = await pool.query(dataQuery, values);
            
            const totalPages = Math.ceil(total / limit);
            
            return {
                success: true,
                data: {
                    bookings: dataResult.rows,
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
    
    private getPaymentStatusCondition(status: string): string {
        switch (status) {
            case 'unpaid':
                return `NOT EXISTS(
                    SELECT 1 FROM payments p
                    JOIN payment_statuses ps ON p.status = ps.status_code
                    WHERE p.booking_id = b.booking_id
                      AND ps.is_completed = TRUE
                      AND p.deleted_at IS NULL
                )`;
            case 'partial':
                return `(
                    SELECT COALESCE(SUM(p.amount), 0)
                    FROM payments p
                    JOIN payment_statuses ps ON p.status = ps.status_code
                    JOIN payment_types pt ON p.payment_type = pt.type_code
                    WHERE p.booking_id = b.booking_id
                      AND ps.is_completed = TRUE
                      AND pt.affects_balance = 'increase'
                      AND p.deleted_at IS NULL
                ) BETWEEN 0.01 AND b.total_amount - 0.01`;
            case 'paid':
                return `(
                    SELECT COALESCE(SUM(p.amount), 0)
                    FROM payments p
                    JOIN payment_statuses ps ON p.status = ps.status_code
                    JOIN payment_types pt ON p.payment_type = pt.type_code
                    WHERE p.booking_id = b.booking_id
                      AND ps.is_completed = TRUE
                      AND pt.affects_balance = 'increase'
                      AND p.deleted_at IS NULL
                ) >= b.total_amount`;
            default:
                return '1=1';
        }
    }
}

export async function readAllBookingsDAO(
    filters: Filters
): Promise<{ success: boolean; data?: BookingListResponseInterface }> {
    const dao = new ReadAllBookingsDAO();
    return dao.readAllBookings(filters);
}
