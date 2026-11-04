// Creates an admin login, or resets an existing one, in the database this
// install's envs/.env points at - the same file the API itself loads.
//
// Run it on the server that serves the API. The account then lands in the
// database the live API actually reads. envs/.env.production in the repo is
// never loaded by the app, so it is no guide to which database that is: an
// account inserted there by hand returned INVALID_CREDENTIALS from the live API.
//
// It prints the database it connected to before writing, and checks the new
// account the way signin does before committing. --dry-run rolls it all back.
//
// Usage (from the repo, or from anywhere with --app-dir):
//   node scripts/seed-admin.js --list-companies
//   node scripts/seed-admin.js --email someone@example.com --company <company_id> [--first Name] [--last Name] [--dry-run]
//
// The password comes from SEED_ADMIN_PASSWORD, or --password. The variable
// keeps it out of shell history.
//
// Copying this file into the server's checkout without committing it makes
// deploy.sh refuse to run (it treats untracked files as local changes). Keep
// the copy elsewhere and pass --app-dir instead.

const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i];
        if (!key.startsWith('--')) continue;
        const next = argv[i + 1];
        if (next === undefined || next.startsWith('--')) {
            args[key.slice(2)] = true;
        } else {
            args[key.slice(2)] = next;
            i++;
        }
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));
const APP_DIR = path.resolve(args['app-dir'] || path.join(__dirname, '..'));
const ENV_FILE = path.join(APP_DIR, 'envs', '.env');

// Load pg, argon2 and friends from the install being seeded, so this works
// when the script sits outside the checkout.
const appRequire = createRequire(path.join(APP_DIR, 'package.json'));

// Same rules as passwordZodSchema. Signin validates the password before it
// checks credentials, so a password that fails these could never log in.
function passwordProblems(password) {
    const problems = [];
    if (password.length < 8 || password.length > 128) problems.push('8-128 characters');
    if (!/[A-Z]/.test(password)) problems.push('an uppercase letter');
    if (!/[a-z]/.test(password)) problems.push('a lowercase letter');
    if (!/[0-9]/.test(password)) problems.push('a number');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) problems.push('a special character');
    return problems;
}

// The query SignIn_DAO runs, so the final check sees what the API will see.
const SIGNIN_QUERY = `
    SELECT u.user_id, u.password_hash, u.is_active, a.admin_id, ARRAY_AGG(r.role_code) AS roles
    FROM users u
    LEFT JOIN user_roles ur ON u.user_id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.role_id
    LEFT JOIN customers c ON c.user_id = u.user_id AND c.deleted_at IS NULL
    LEFT JOIN staff s ON s.user_id = u.user_id AND s.deleted_at IS NULL
    LEFT JOIN admins a ON a.user_id = u.user_id AND a.deleted_at IS NULL
    WHERE u.email = $1 AND u.deleted_at IS NULL
    GROUP BY u.user_id, c.customer_id, s.staff_id, a.admin_id`;

async function main() {
    if (!fs.existsSync(ENV_FILE)) {
        throw new Error(`${ENV_FILE} not found. Pass --app-dir with the API's install directory.`);
    }

    appRequire('dotenv').config({ path: ENV_FILE });
    const { Client } = appRequire('pg');
    const argon2 = appRequire('argon2');
    const { ulid } = appRequire('ulid');

    const client = new Client({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    });
    await client.connect();

    try {
        const target = (await client.query(
            'SELECT current_database() AS db, inet_server_addr() AS addr, inet_server_port() AS port'
        )).rows[0];
        console.log(`env file: ${ENV_FILE}`);
        console.log(`database: ${target.db} on ${process.env.DB_HOST} (${target.addr || 'local socket'}:${target.port})`);

        if (args['list-companies']) {
            const companies = await client.query('SELECT company_id, company_name FROM companies ORDER BY company_name');
            console.table(companies.rows);
            return;
        }

        const email = typeof args.email === 'string' ? args.email.trim().toLowerCase() : '';
        const companyId = typeof args.company === 'string' ? args.company.trim() : '';
        const password = process.env.SEED_ADMIN_PASSWORD || (typeof args.password === 'string' ? args.password : '');

        if (!email || !companyId || !password) {
            throw new Error('--email, --company and a password (SEED_ADMIN_PASSWORD or --password) are required');
        }
        const problems = passwordProblems(password);
        if (problems.length) {
            throw new Error(`password needs ${problems.join(', ')}`);
        }

        const company = (await client.query('SELECT company_name FROM companies WHERE company_id = $1', [companyId])).rows[0];
        if (!company) {
            throw new Error(`company ${companyId} is not in ${target.db}. Run with --list-companies to see the ones that are.`);
        }

        const adminRole = (await client.query("SELECT role_id FROM roles WHERE role_code = 'admin'")).rows[0];
        if (!adminRole) {
            throw new Error(`no 'admin' role in ${target.db}`);
        }

        // Mirrors Password_Manager's options; verify reads them back from the hash.
        const passwordHash = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: Number(process.env.ARGON2_MEMORY_COST || 65536),
            timeCost: Number(process.env.ARGON2_TIME_COST || 3),
            parallelism: Number(process.env.ARGON2_PARALLELISM || 2),
            hashLength: 32
        });

        await client.query('BEGIN');

        const existing = (await client.query(
            'SELECT user_id FROM users WHERE email = $1 AND deleted_at IS NULL', [email]
        )).rows[0];

        let userId;
        if (existing) {
            userId = existing.user_id;
            await client.query(
                `UPDATE users SET password_hash = $1, company_id = $2, is_active = TRUE, updated_at = NOW()
                 WHERE user_id = $3`,
                [passwordHash, companyId, userId]
            );
            console.log(`user exists (${userId}): password reset, account activated`);
        } else {
            userId = ulid();
            await client.query(
                `INSERT INTO users (
                    user_id, company_id, email, password_hash,
                    first_name, last_name, phone,
                    is_active, email_verified, phone_verified,
                    created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, NULL, TRUE, TRUE, FALSE, NOW(), NOW())`,
                [userId, companyId, email, passwordHash, args.first || 'Admin', args.last || 'User']
            );
            console.log(`user created (${userId})`);
        }

        // Self-assigned, like the existing seeded admins: no other user is
        // guaranteed to exist in this database.
        await client.query(
            `INSERT INTO user_roles (user_role_id, user_id, role_id, assigned_by, created_at)
             VALUES ($1, $2, $3, $2, NOW())
             ON CONFLICT (user_id, role_id) DO NOTHING`,
            [ulid(), userId, adminRole.role_id]
        );

        await client.query(
            `INSERT INTO admins (admin_id, company_id, user_id, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             ON CONFLICT (user_id) DO UPDATE SET company_id = EXCLUDED.company_id, deleted_at = NULL, updated_at = NOW()`,
            [ulid(), companyId, userId]
        );

        // trg_admins_single_profile is deferred; fire it now so a violation
        // fails here rather than at COMMIT, after the check below has passed.
        await client.query('SET CONSTRAINTS ALL IMMEDIATE');

        const row = (await client.query(SIGNIN_QUERY, [email])).rows[0];
        const passwordOk = row ? await argon2.verify(row.password_hash, password) : false;
        if (!row || !row.is_active || !passwordOk || !row.roles.includes('admin')) {
            throw new Error('signin check failed after writing - rolled back');
        }
        console.log(`signin check passed: roles ${JSON.stringify(row.roles.filter(Boolean))}, company ${company.company_name}`);

        if (args['dry-run']) {
            await client.query('ROLLBACK');
            console.log('dry run - rolled back, nothing saved');
        } else {
            await client.query('COMMIT');
            console.log(`saved. Log in as ${email}`);
        }
    } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
    } finally {
        await client.end();
    }
}

main().catch((error) => {
    console.error('seed-admin failed:', error.message);
    process.exit(1);
});
