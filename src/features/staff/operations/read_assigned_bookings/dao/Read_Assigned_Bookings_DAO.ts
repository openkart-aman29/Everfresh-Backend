// src/features/staff/operations/read_assigned_bookings/dao/Read_Assigned_Bookings_DAO.ts
import { getDatabase } from '@/database/Database_Connection_Manager';
import { AssignedBooking } from '@/features/staff/interfaces/Staff_Assigned_Bookings.interface';
import { staffLogger } from '@/features/staff/logger/Staff_Logger';

interface ReadAssignedBookingsResult {
    bookings: AssignedBooking[];
    totalCount: number;
}

export class ReadAssignedBookingsDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            staffLogger.error('Database pool not available');
            throw new Error('Database pool not available');
        }
        return pool;
    }

    async getBookingsAssignedToStaff(
        staffId: string,
        companyId: string,
        limit: number,
        offset: number,
        status?: string,
        fromDate?: string,
        toDate?: string,
        sortOrder: string = 'desc'
    ): Promise<ReadAssignedBookingsResult> {
        try {
            const pool = this.getPool();

            // Note: This is a placeholder implementation.
            // In the actual booking module, this would query the bookings table.
            // For now, returning empty results as booking module doesn't exist yet.

            staffLogger.info('ReadAssignedBookingsDAO.getBookingsAssignedToStaff executing query', {
                staffId,
                companyId,
                limit,
                offset,
                status,
                fromDate,
                toDate,
                sortOrder
            });

            // Build dynamic filters and parameters
            const filters: string[] = ['b.staff_id = $1', 'b.company_id = $2', 'b.deleted_at IS NULL'];
            const params: any[] = [staffId, companyId];
            let idx = 3;

            if (status) {
                filters.push(`b.status = $${idx}`);
                params.push(status);
                idx++;
            }

            if (fromDate) {
                filters.push(`b.scheduled_date >= $${idx}`);
                params.push(fromDate);
                idx++;
            }

            if (toDate) {
                filters.push(`b.scheduled_date <= $${idx}`);
                params.push(toDate);
                idx++;
            }

            const whereClause = `WHERE ${filters.join(' AND ')}`;
            const orderDir = (sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

            // Query to fetch paginated booking rows
            const dataQuery = `
                SELECT
                    b.booking_id,
                    b.booking_number,
                    b.status AS status_code,
                    b.scheduled_date,
                    b.scheduled_time_start,
                    b.scheduled_time_end,
                    b.service_location,
                    b.total_amount,

                    -- Customer Details
                    cust.customer_id,
                    CONCAT(cu.first_name, ' ', cu.last_name) AS customer_name,
                    cu.phone AS customer_phone,
                    cu.email AS customer_email,

                    -- Service Details
                    s.service_name,
                    s.category AS service_category,

                    -- Status details
                    bs.status_name,
                    bs.is_terminal,
                    bs.allow_transitions_to,
                    bs.color_code,

                    -- Timestamps
                    b.created_at,
                    b.updated_at
                FROM bookings b
                LEFT JOIN booking_statuses bs ON bs.status_code = b.status
                LEFT JOIN services s ON b.service_id = s.service_id
                LEFT JOIN customers cust ON b.customer_id = cust.customer_id
                LEFT JOIN users cu ON cust.user_id = cu.user_id
                ${whereClause}
                ORDER BY b.scheduled_date ${orderDir}, b.scheduled_time_start ${orderDir}
                LIMIT $${idx} OFFSET $${idx + 1}
            `;

            // Params for data query (include limit & offset)
            const dataParams = [...params, limit, offset];

            const countQuery = `
                SELECT COUNT(*)::int AS total
                FROM bookings b
                ${whereClause}
            `;

            // Execute queries
            const [dataResult, countResult] = await Promise.all([
                pool.query(dataQuery, dataParams),
                pool.query(countQuery, params)
            ]);

            const rows = dataResult.rows;

            // Map DB rows to AssignedBooking interface
            const bookings: AssignedBooking[] = rows.map((r: any) => ({
                bookingId: r.booking_id,
                scheduledDate: r.scheduled_date,
                startTime: r.scheduled_time_start,
                endTime: r.scheduled_time_end,
                serviceName: r.service_name,
                customer: {
                    customerId: r.customer_id,
                    name: r.customer_name,
                    phone: r.customer_phone
                },
                status: {
                    code: r.status_code,
                    name: r.status_name || null,
                    isTerminal: Boolean(r.is_terminal),
                    allowedTransitions: r.allow_transitions_to ? String(r.allow_transitions_to).split(',') : [],
                    color: r.color_code || ''
                }
            }));

            const totalCount = (countResult.rows[0]?.total ?? 0) as number;

            staffLogger.info('ReadAssignedBookingsDAO.getBookingsAssignedToStaff completed', { bookings: bookings.length, totalCount });

            return { bookings, totalCount };

        } catch (error) {
            staffLogger.error('Error fetching assigned bookings', { staffId, companyId, error });
            throw error;
        }
    }
}