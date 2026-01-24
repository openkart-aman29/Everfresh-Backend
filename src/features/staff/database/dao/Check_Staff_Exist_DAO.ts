import { getDatabase } from '@/database/Database_Connection_Manager';

export async function checkStaffExistDAO(staffId: string, companyId: string) {
  const pool = getDatabase();
  if (!pool) return { exists: false };

  const query = `SELECT 1 FROM staff WHERE staff_id = $1 AND company_id = $2 AND deleted_at IS NULL LIMIT 1`;
  const values = [staffId, companyId];
  try {
    const res = await pool.query(query, values);
    return { exists: (res.rowCount || 0) > 0 };
  } catch (error) {
    return { exists: false };
  }
}
