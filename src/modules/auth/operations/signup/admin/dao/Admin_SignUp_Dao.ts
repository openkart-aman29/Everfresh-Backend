
import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
import { generateULID } from '@/utilities/id_generator/ULID_Generator';
import { CreateUserInterface } from '@/modules/auth/interface/Auth_Interface';
import { PoolClient } from 'pg';

export interface CreateAdminUserParams {
    userData: CreateUserInterface;
    role_code: 'admin';
    assigned_by: string; // Super admin's user_id
}

class AdminSignUpDAO extends BaseAuthDAO {

    async createUserWithRole(
        params: CreateAdminUserParams
    ): Promise<{
        success: boolean;
        user?: any;
        role_code?: 'admin';
    }> {
        const pool = this.getPool();
        if (!pool) return { success: false };

        const client: PoolClient = await pool.connect();

        try {
            await client.query('BEGIN');

            const { userData, assigned_by } = params;

            /* 1️⃣ Create user */
            const userResult = await client.query(
                `
                INSERT INTO users (
                    user_id, company_id, email, password_hash,
                    first_name, last_name, phone,
                    is_active, email_verified, phone_verified,
                    created_at, updated_at
                )
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
                RETURNING *
                `,
                [
                    userData.user_id,
                    userData.company_id,
                    userData.email,
                    userData.password_hash,
                    userData.first_name,
                    userData.last_name,
                    userData.phone ?? null,
                    userData.is_active,
                    userData.email_verified,
                    userData.phone_verified
                ]
            );

            const user = userResult.rows[0];

            /* 2️⃣ Assign ADMIN role */
            const userRoleId = generateULID();

            await client.query(
                `
                INSERT INTO user_roles (
                    user_role_id, user_id, role_id,
                    assigned_by, created_at
                )
                SELECT $1, $2, role_id, $3, NOW()
                FROM roles
                WHERE role_code = 'admin'
                `,
                [
                    userRoleId,
                    user.user_id,
                    assigned_by
                ]
            );

            /* 3️⃣ Insert into ADMINS table */
            const adminId = generateULID();

            await client.query(
                `
                INSERT INTO admins (
                    admin_id, company_id, user_id,
                    created_at, updated_at
                )
                VALUES ($1, $2, $3, NOW(), NOW())
                `,
                [
                    adminId,
                    userData.company_id,
                    user.user_id
                ]
            );

            /* 4️⃣ NO STAFF PROFILE - Admin is linked via admins table */

            await client.query('COMMIT');

            return {
                success: true,
                user,
                role_code: 'admin'
            };

        } catch (error) {
            await client.query('ROLLBACK');
            this.logError('createUserWithRole', error);
            return { success: false };
        } finally {
            client.release();
        }
    }
}

export const adminSignUpDAO = async (
    params: CreateAdminUserParams
) => {
    const dao = new AdminSignUpDAO();
    return dao.createUserWithRole(params);
};