// src/features/enquiries/operations/create/dao/Create_Enquiry_Dao.ts

import { getDatabase } from '@/database/Database_Connection_Manager';
import { enquiryLogger } from '@/features/enquiries/logger/Enquiry_Logger';
import {
    CreateEnquiryRequest,
    EnquiryRecord,
    EnquiryRequestContext,
} from '@/features/enquiries/interfaces/Enquiry.interface';
import { ENQUIRY_ROW_COLUMNS } from '@/features/enquiries/dao/Enquiry_Row_Columns';
import { ReverseGeocodeResult } from '@/utilities/geocoding/Reverse_Geocode_Service';

export class CreateEnquiryDAO {
    private getPool() {
        const pool = getDatabase();
        if (!pool) {
            throw new Error('Database pool not available');
        }
        return pool;
    }

    /**
     * Confirms a service belongs to the given tenant before it is referenced.
     * Returns the catalogue name so the enquiry keeps a readable snapshot even
     * if the service is renamed or removed later.
     */
    async findServiceForCompany(
        serviceId: string,
        companyId: string
    ): Promise<{ service_id: string; service_name: string } | null> {
        const pool = this.getPool();

        const result = await pool.query(
            `SELECT service_id, service_name
               FROM services
              WHERE service_id = $1
                AND company_id = $2
                AND is_active = TRUE
                AND deleted_at IS NULL`,
            [serviceId, companyId]
        );

        return result.rows[0] ?? null;
    }

    async insertEnquiry(
        enquiryId: string,
        companyId: string,
        input: CreateEnquiryRequest,
        serviceName: string | null,
        context: EnquiryRequestContext,
        geocoded: ReverseGeocodeResult | null
    ): Promise<EnquiryRecord> {
        const pool = this.getPool();

        const result = await pool.query(
            `INSERT INTO service_enquiries
                (enquiry_id, company_id, full_name, email, phone,
                 service_id, service_name, message, preferred_date, preferred_time,
                 latitude, longitude, location_accuracy, resolved_address, geocoded_at,
                 source, ip_address, user_agent)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                     $11, $12, $13, $14, $15,
                     'website', $16, $17)
             RETURNING ${ENQUIRY_ROW_COLUMNS}`,
            [
                enquiryId,
                companyId,
                input.full_name,
                input.email,
                input.phone,
                input.service_id ?? null,
                serviceName,
                input.message ?? null,
                input.preferred_date ?? null,
                input.preferred_time ?? null,
                input.latitude ?? null,
                input.longitude ?? null,
                input.location_accuracy ?? null,
                geocoded?.formattedAddress ?? null,
                geocoded?.geocodedAt ?? null,
                context.ip_address,
                context.user_agent,
            ]
        );

        enquiryLogger.info('Enquiry row inserted', { enquiryId, companyId });

        return result.rows[0] as EnquiryRecord;
    }
}

export const createEnquiryDAO = new CreateEnquiryDAO();
