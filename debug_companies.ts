
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from ../envs/.env (relative to backend root)
const envPath = path.resolve(__dirname, '../envs/.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });

const checkCompanies = async () => {
    try {
        console.log('Connecting to DB...');
        const config = {
            host: process.env.DB_HOST,
            port: Number(process.env.DB_PORT),
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        };
        // console.log('DB Config:', { ...config, password: '****' });

        if (!config.host) {
            console.error('DB_HOST is missing. Env load failed?');
            process.exit(1);
        }

        const pool = new Pool(config);

        console.log('Querying companies table...');
        const result = await pool.query('SELECT * FROM companies');
        console.log('Total companies found:', result.rowCount);
        console.log('Companies:', JSON.stringify(result.rows.map(c => ({ id: c.company_id, name: c.company_name, deleted_at: c.deleted_at })), null, 2));

        await pool.end();
        process.exit(0);
    } catch (error) {
        console.error('Error checking companies:', error);
        process.exit(1);
    }
};

checkCompanies();
