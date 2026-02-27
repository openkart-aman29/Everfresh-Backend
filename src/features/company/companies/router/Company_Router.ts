
import { Router } from 'express';
import { readCompanyController } from '@/features/company/companies/operations/read/controller/Read_Company_Controller';
import { readAllCompaniesController } from '@/features/company/companies/operations/read_all/controller/Read_All_Company_Controller';
import { updateCompanyController } from '@/features/company/companies/operations/update/controller/Update_Company_Controller';
import { createCompanyController } from '@/features/company/companies/operations/create/controller/Create_Company_Controller';
import { deleteCompanyController } from '@/features/company/companies/operations/delete/controller/Delete_Company_Controller';
import { jwtVerificationMiddleware } from '@/modules/auth/middleware/JWT_Verification_Middleware';
import { roleAuthorizationMiddleware } from '@/modules/auth/middleware/Role_Authorization_Middleware';
// import { rateLimitMiddleware } from '@/utilities/middleware/Rate_Limit_Middleware';

const companyRouter = Router();

// POST /create - Create a new company (Super Admin only)
companyRouter.post('/create', jwtVerificationMiddleware, roleAuthorizationMiddleware(['super_admin']), createCompanyController);

// GET /read/:companyId - Get company by ID
companyRouter.get('/read/:companyId', jwtVerificationMiddleware, roleAuthorizationMiddleware(['admin', 'super_admin']), readCompanyController);
companyRouter.get('/read-all', jwtVerificationMiddleware, roleAuthorizationMiddleware(['super_admin']), readAllCompaniesController);

// PUT /update/:companyId - Update company details (Super Admin only)
companyRouter.put('/update/:companyId', jwtVerificationMiddleware, roleAuthorizationMiddleware(['super_admin']), updateCompanyController);

// DELETE /delete/:companyId - Soft delete company (Super Admin only)
companyRouter.delete('/delete/:companyId', jwtVerificationMiddleware, roleAuthorizationMiddleware(['super_admin']), deleteCompanyController);

export default companyRouter;
