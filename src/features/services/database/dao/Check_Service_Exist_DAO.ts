import { getDatabase } from '@/database/Database_Connection_Manager';

export async function checkServiceExistDAO(serviceId: string, companyId: string) {
  const pool = getDatabase();
  if (!pool) return { exists: false };

  const query = `SELECT 1 FROM services WHERE service_id = $1 AND company_id = $2 AND deleted_at IS NULL LIMIT 1`;
  const values = [serviceId, companyId];
  try {
    const res = await pool.query(query, values);
    return { exists: (res.rowCount || 0) > 0 };
  } catch (error) {
    return { exists: false };
  }
}
