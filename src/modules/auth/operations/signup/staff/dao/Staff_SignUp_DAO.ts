// import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
// import { generateULID } from '@/utilities/id_generator/ULID_Generator';
// import { CreateUserInterface } from '@/modules/auth/interface/Auth_Interface';
// import { PoolClient } from 'pg';


// interface StaffProfileData {
//     staff_id: string;
//     company_id: string;
//     user_id: string;
// }


// class StaffSignUpDAO extends BaseAuthDAO {
//     async createStaffWithProfile(
//         userData: CreateUserInterface,
//         staffData: StaffProfileData,
//         role_code: string
//     ): Promise<{ success: boolean; user?: any; staff?: any, assignedRoleCode?:string; }> {
//         const pool = this.getPool();
//         if (!pool) {
//             return { success: false };
//         }

//         const client: PoolClient = await pool.connect();

//         try {
//             await client.query('BEGIN');

//             // 1. Create user
//             const userQuery = `
//                 INSERT INTO users (
//                     user_id, company_id, email, password_hash,
//                     first_name, last_name, phone,
//                     is_active, email_verified, phone_verified,
//                     created_at, updated_at
//                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
//                 RETURNING *
//             `;

//             const userValues = [
//                 userData.user_id,
//                 userData.company_id,
//                 userData.email,
//                 userData.password_hash,
//                 userData.first_name,
//                 userData.last_name,
//                 userData.phone || null,
//                 userData.is_active,
//                 userData.email_verified,
//                 userData.phone_verified,
//                 new Date(),
//                 new Date()
//             ];

//             const userResult = await client.query(userQuery, userValues);
//             const user = userResult.rows[0];

//             // 2. Create staff profile
//             const staffQuery = `
//                 INSERT INTO staff (
//                     staff_id, company_id, user_id,
//                     is_available, skills,
//                     created_at, updated_at
//                 ) VALUES ($1, $2, $3, $4, $5, $6, $7)
//                 RETURNING *
//             `;

//             const staffValues = [
//                 staffData.staff_id,
//                 staffData.company_id,
//                 staffData.user_id,
//                 1, // is_available 0 for false, 1 for true
//                 null, // skills
//                 new Date(),
//                 new Date()
//             ];

//             const staffResult = await client.query(staffQuery, staffValues);
//             const staff = staffResult.rows[0];

//             // 3. Assign staff role
//             const roleQuery = `
//                 INSERT INTO user_roles (user_role_id, user_id, role_id, assigned_by, created_at)
//                 SELECT $1, $2, role_id, $3, $4
//                 FROM roles
//                 WHERE role_code = $5
//             `;

//             const userRoleId = generateULID();
//             const assignedRoleCode = role_code === 'admin' ? 'admin' : 'staff';

//             await client.query(roleQuery, [
//                 userRoleId,
//                 userData.user_id,
//                 userData.user_id, // self-assigned for staff registration
//                 new Date(),
//                 assignedRoleCode
//             ]);

//             await client.query('COMMIT');

//             this.logInfo('createStaffWithProfile', {
//                 user_id: user.user_id,
//                 staff_id: staff.staff_id
//             });

//             return {
//                 success: true,
//                 user,
//                 staff,
//                 assignedRoleCode
//             };
            
//         } catch (error) {
//             await client.query('ROLLBACK');
//             this.logError('createStaffWithProfile', error);
//             return { success: false };
//         } finally {
//             client.release();
//         }
//     }
// }



// export async function staffSignUpDAO(
//     userData: CreateUserInterface,
//     staffData: StaffProfileData,
//     role_code: string
// ): Promise<{ success: boolean; user?: any; staff?: any; assignedRoleCode?:string;}> {
//     const dao = new StaffSignUpDAO();
//     return dao.createStaffWithProfile(userData, staffData, role_code);
// }

// import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
// import { generateULID } from '@/utilities/id_generator/ULID_Generator';
// import { CreateUserInterface } from '@/modules/auth/interface/Auth_Interface';
// import { PoolClient } from 'pg';

// interface StaffProfileData {
//     staff_id: string;
//     company_id: string;
//     user_id: string;
// }

// class StaffSignUpDAO extends BaseAuthDAO {
//     async createUserWithRole(
//         userData: CreateUserInterface,
//         role_code: string,
//         staffData?: StaffProfileData  // Optional - only for actual service staff
//     ): Promise<{ 
//         success: boolean; 
//         user?: any; 
//         staff?: any; 
//         assignedRoleCode?: string; 
//     }> {
//         const pool = this.getPool();
//         if (!pool) {
//             return { success: false };
//         }

//         const client: PoolClient = await pool.connect();

//         try {
//             await client.query('BEGIN');

//             // 1. Create user
//             const userQuery = `
//                 INSERT INTO users (
//                     user_id, company_id, email, password_hash,
//                     first_name, last_name, phone,
//                     is_active, email_verified, phone_verified,
//                     created_at, updated_at
//                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
//                 RETURNING *
//             `;

//             const userValues = [
//                 userData.user_id,
//                 userData.company_id,
//                 userData.email,
//                 userData.password_hash,
//                 userData.first_name,
//                 userData.last_name,
//                 userData.phone || null,
//                 userData.is_active,
//                 userData.email_verified,
//                 userData.phone_verified,
//                 new Date(),
//                 new Date()
//             ];

//             const userResult = await client.query(userQuery, userValues);
//             const user = userResult.rows[0];

//             let staff = null;

//             // 2. Create staff profile ONLY if role is 'staff' (not admin/super_admin)
//             if (role_code === 'staff' && staffData) {
//                 const staffQuery = `
//                     INSERT INTO staff (
//                         staff_id, company_id, user_id,
//                         is_available, skills,
//                         created_at, updated_at
//                     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
//                     RETURNING *
//                 `;

//                 const staffValues = [
//                     staffData.staff_id,
//                     staffData.company_id,
//                     staffData.user_id,
//                     true, // is_available - true for service staff
//                     null, // skills
//                     new Date(),
//                     new Date()
//                 ];

//                 const staffResult = await client.query(staffQuery, staffValues);
//                 staff = staffResult.rows[0];
//             }

//             // 3. Validate role code
//             const validRoles = ['staff', 'admin', 'super_admin', 'manager'];
//             const assignedRoleCode = validRoles.includes(role_code) ? role_code : 'staff';

//             // 4. Assign role to user
//             const roleQuery = `
//                 INSERT INTO user_roles (user_role_id, user_id, role_id, assigned_by, created_at)
//                 SELECT $1, $2, role_id, $3, $4
//                 FROM roles
//                 WHERE role_code = $5
//                 RETURNING *
//             `;

//             const userRoleId = generateULID();
//             const roleResult = await client.query(roleQuery, [
//                 userRoleId,
//                 userData.user_id,
//                 userData.user_id, // self-assigned during registration
//                 new Date(),
//                 assignedRoleCode
//             ]);

//             // Check if role was assigned successfully
//             if (roleResult.rowCount === 0) {
//                 throw new Error(`Invalid role code: ${assignedRoleCode}`);
//             }

//             await client.query('COMMIT');

//             this.logInfo('createUserWithRole', {
//                 user_id: user.user_id,
//                 role_code: assignedRoleCode,
//                 has_staff_profile: staff !== null,
//                 staff_id: staff?.staff_id || null
//             });

//             return {
//                 success: true,
//                 user,
//                 staff,
//                 assignedRoleCode
//             };
            
//         } catch (error) {
//             await client.query('ROLLBACK');
//             this.logError('createUserWithRole', error);
//             return { success: false };
//         } finally {
//             client.release();
//         }
//     }
// }

// export async function staffSignUpDAO(
//     userData: CreateUserInterface,
//     staffData: StaffProfileData | undefined,
//     role_code: string
// ): Promise<{ 
//     success: boolean; 
//     user?: any; 
//     staff?: any; 
//     assignedRoleCode?: string;
// }> {
//     const dao = new StaffSignUpDAO();
//     return dao.createUserWithRole(userData, role_code, staffData);
// }

// src/modules/auth/operations/signup/staff/dao/Staff_SignUp_DAO.ts

// import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
// import { generateULID } from '@/utilities/id_generator/ULID_Generator';
// import { CreateUserInterface } from '@/modules/auth/interface/Auth_Interface';
// import { PoolClient } from 'pg';

// export interface StaffProfileData {
//     staff_id: string;
//     company_id: string;
//     user_id: string;
// }

// export interface CreateStaffUserParams {
//     userData: CreateUserInterface;
//     role_code: 'staff' | 'admin' | 'manager' | 'super_admin';
//     staffData?: StaffProfileData; // ONLY when creating real staff
//     assigned_by: string;
// }

// class StaffSignUpDAO extends BaseAuthDAO {

//     async createUserWithRole(
//         params: CreateStaffUserParams
//     ): Promise<{
//         success: boolean;
//         user?: any;
//         staff?: any;
//         role_code?: string;
//     }> {
//         const pool = this.getPool();
//         if (!pool) return { success: false };

//         const client: PoolClient = await pool.connect();

//         try {
//             await client.query('BEGIN');

//             const {
//                 userData,
//                 role_code,
//                 staffData,
//                 assigned_by
//             } = params;

//             /* 1️⃣ Create user */
//             const userResult = await client.query(
//                 `
//                 INSERT INTO users (
//                     user_id, company_id, email, password_hash,
//                     first_name, last_name, phone,
//                     is_active, email_verified, phone_verified,
//                     created_at, updated_at
//                 )
//                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
//                 RETURNING *
//                 `,
//                 [
//                     userData.user_id,
//                     userData.company_id,
//                     userData.email,
//                     userData.password_hash,
//                     userData.first_name,
//                     userData.last_name,
//                     userData.phone ?? null,
//                     userData.is_active,
//                     userData.email_verified,
//                     userData.phone_verified
//                 ]
//             );

//             const user = userResult.rows[0];

//             /* 2️⃣ Create staff profile ONLY if staffData is provided */
//             let staff = null;

//             if (staffData) {
//                 const staffResult = await client.query(
//                     `
//                     INSERT INTO staff (
//                         staff_id, company_id, user_id,
//                         is_available, skills,
//                         created_at, updated_at
//                     )
//                     VALUES ($1,$2,$3,false,NULL,NOW(),NOW())
//                     RETURNING *
//                     `,
//                     [
//                         staffData.staff_id,
//                         staffData.company_id,
//                         staffData.user_id
//                     ]
//                 );

//                 staff = staffResult.rows[0];
//             }

//             /* 3️⃣ Assign role */
//             const userRoleId = generateULID();

//             const roleAssignResult = await client.query(
//                 `
//                 INSERT INTO user_roles (
//                     user_role_id, user_id, role_id,
//                     assigned_by, created_at
//                 )
//                 SELECT $1, $2, role_id, $3, NOW()
//                 FROM roles
//                 WHERE role_code = $4
//                 RETURNING *
//                 `,
//                 [
//                     userRoleId,
//                     user.user_id,
//                     assigned_by,
//                     role_code
//                 ]
//             );

//             if (roleAssignResult.rowCount === 0) {
//                 throw new Error(`Invalid role_code: ${role_code}`);
//             }

//             await client.query('COMMIT');

//             this.logInfo('createUserWithRole', {
//                 user_id: user.user_id,
//                 role_code,
//                 has_staff_profile: !!staff
//             });

//             return {
//                 success: true,
//                 user,
//                 staff,
//                 role_code
//             };

//         } catch (error) {
//             await client.query('ROLLBACK');
//             this.logError('createUserWithRole', error);
//             return { success: false };
//         } finally {
//             client.release();
//         }
//     }
// }

// export const staffSignUpDAO = async (
//     params: CreateStaffUserParams
// ) => {
//     const dao = new StaffSignUpDAO();
//     return dao.createUserWithRole(params);
// };

import { BaseAuthDAO } from '@/modules/auth/database/dao/Base_Auth_DAO';
import { generateULID } from '@/utilities/id_generator/ULID_Generator';
import { CreateUserInterface } from '@/modules/auth/interface/Auth_Interface';
import { PoolClient } from 'pg';

export interface StaffProfileData {
    staff_id: string;
    company_id: string;
    user_id: string;
}

export interface CreateStaffUserParams {
    userData: CreateUserInterface;
    role_code: 'staff';
    staffData: StaffProfileData;
    assigned_by: string;
}

class StaffSignUpDAO extends BaseAuthDAO {

    async createUserWithRole(
        params: CreateStaffUserParams
    ): Promise<{
        success: boolean;
        user?: any;
        staff?: any;
        role_code?: 'staff';
    }> {
        const pool = this.getPool();
        if (!pool) return { success: false };

        const client: PoolClient = await pool.connect();

        try {
            await client.query('BEGIN');

            const { userData, staffData, assigned_by } = params;

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

            /* 2️⃣ Create staff profile (MANDATORY) */
            const staffResult = await client.query(
                `
                INSERT INTO staff (
                    staff_id, company_id, user_id,
                    is_available, skills,
                    created_at, updated_at
                )
                VALUES ($1,$2,$3,false,NULL,NOW(),NOW())
                RETURNING *
                `,
                [
                    staffData.staff_id,
                    staffData.company_id,
                    staffData.user_id
                ]
            );

            const staff = staffResult.rows[0];

            /* 3️⃣ Assign STAFF role */
            const userRoleId = generateULID();

            await client.query(
                `
                INSERT INTO user_roles (
                    user_role_id, user_id, role_id,
                    assigned_by, created_at
                )
                SELECT $1, $2, role_id, $3, NOW()
                FROM roles
                WHERE role_code = 'staff'
                `,
                [
                    userRoleId,
                    user.user_id,
                    assigned_by
                ]
            );

            await client.query('COMMIT');

            return {
                success: true,
                user,
                staff,
                role_code: 'staff'
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

export const staffSignUpDAO = async (
    params: CreateStaffUserParams
) => {
    const dao = new StaffSignUpDAO();
    return dao.createUserWithRole(params);
};
