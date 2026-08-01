import { z } from 'zod';
export const organizationRoleSchema=z.enum(['OWNER','ADMIN','CONTRACT_MANAGER','LEGAL_OFFICER','DEPARTMENT_MANAGER','FINANCE_OFFICER','PROCUREMENT_OFFICER','CONTRACT_OWNER','AUDITOR','VIEWER']);
export const organizationSchema=z.object({id:z.uuid(),slug:z.string(),name:z.string(),status:z.enum(['ACTIVE','SUSPENDED'])});
