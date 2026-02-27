import { createCompanyDAO } from '@/features/company/companies/operations/create/dao/Create_Company_Dao';
import { CreateCompanyInput } from '@/features/company/companies/interfaces/Company_Request.interface';
import { CompanyDetailsResponse } from '@/features/company/companies/interfaces/Company_Response.interface';
import { companyLogger } from '@/features/company/companies/logger/Company_Logger';

export const createCompanyService = async (
    inputData: CreateCompanyInput
): Promise<{ success: boolean; data?: CompanyDetailsResponse; error?: string; status: number }> => {
    try {
        companyLogger.info('Creating new company', { company_name: inputData.company_name });

        // Logic handled inside DAO (including ULID generation and defaults)
        const company = await createCompanyDAO.createCompany(inputData);

        companyLogger.info('Company created successfully', { company_id: company.company_id });

        return {
            success: true,
            data: company,
            status: 201
        };
    } catch (error: any) {
        if (error.message.includes('Unique constraint violation')) {
            let conflictField = "Field";
            if (error.message.includes('companies_slug_key')) conflictField = "Slug";
            else if (error.message.includes('companies_email_key')) conflictField = "Email";

            return {
                success: false,
                error: `${conflictField} is already in use by another company.`,
                status: 409
            };
        }

        companyLogger.error('Service error creating company', { error: error.message });
        return {
            success: false,
            error: 'An unexpected error occurred while creating the company',
            status: 500
        };
    }
};
