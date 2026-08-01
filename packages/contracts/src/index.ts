import { z } from 'zod';
export const organizationRoleSchema=z.enum(['OWNER','ADMIN','CONTRACT_MANAGER','LEGAL_OFFICER','DEPARTMENT_MANAGER','FINANCE_OFFICER','PROCUREMENT_OFFICER','CONTRACT_OWNER','AUDITOR','VIEWER']);
export const organizationSchema=z.object({id:z.uuid(),slug:z.string(),name:z.string(),status:z.enum(['ACTIVE','SUSPENDED'])});
export const departmentSchema=z.object({id:z.uuid(),organizationId:z.uuid(),parentId:z.uuid().nullable(),code:z.string(),name:z.string(),isActive:z.boolean()});
export const invitationSchema=z.object({id:z.uuid(),organizationId:z.uuid(),email:z.email(),role:organizationRoleSchema,status:z.enum(['PENDING','ACCEPTED','EXPIRED','REVOKED']),expiresAt:z.iso.datetime()});
export const auditEventSchema=z.object({id:z.uuid(),organizationId:z.uuid(),actorUserId:z.uuid().nullable(),action:z.string(),entityType:z.string(),entityId:z.string().nullable(),createdAt:z.iso.datetime()});
