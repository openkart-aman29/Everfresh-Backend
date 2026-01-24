import { getDatabase } from '@/database/Database_Connection_Manager';

export async function getServiceByIdDAO(serviceId: string, companyId: string) {
  const pool = getDatabase();
  if (!pool) return { success: false };

  const query = `SELECT service_id, price, requires_quote FROM services WHERE service_id = $1 AND company_id = $2 AND deleted_at IS NULL LIMIT 1`;
  const values = [serviceId, companyId];
  try {
    const res = await pool.query(query, values);
    if (res.rowCount === 0) return { success: false };
    const row = res.rows[0];
    return { success: true, service: { service_id: row.service_id, price: row.price, requires_quote: row.requires_quote } };
  } catch (error) {
    return { success: false };
  }
}
