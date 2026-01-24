import { getDatabase } from '@/database/Database_Connection_Manager';

export async function getAddonsDAO(addonIds: string[], companyId: string) {
  const pool = getDatabase();
  if (!pool) return { success: false, addons: [] };

  const query = `SELECT addon_id, addon_name, price FROM service_addons WHERE addon_id = ANY($1) AND company_id = $2 AND deleted_at IS NULL`;
  const values = [addonIds, companyId];
  try {
    const res = await pool.query(query, values);
    return { success: true, addons: res.rows };
  } catch (error) {
    return { success: false, addons: [] };
  }
}
