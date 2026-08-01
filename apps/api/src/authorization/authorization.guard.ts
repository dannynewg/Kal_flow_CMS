import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { OrganizationRole } from '@kal-flow/database';
import type { AuthenticatedRequest } from '../auth/authentication.guard';
import { PrismaService } from '../prisma/prisma.service';
import { type Permission, roleHasPermissions } from './permissions';
import { REQUIRED_PERMISSIONS_KEY } from './require-permissions.decorator';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(private readonly reflector:Reflector, private readonly prisma:PrismaService) {}
  async canActivate(context:ExecutionContext):Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY,[context.getHandler(),context.getClass()]);
    if (!required?.length) return true;
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.principal) throw new ForbiddenException('An authenticated principal is required');
    const organizationId = String(request.params.organizationId ?? request.headers['x-organization-id'] ?? '');
    if (!organizationId) throw new ForbiddenException('An organization context is required');
    const membership = await this.prisma.client.membership.findUnique({
      where:{ organizationId_userId:{ organizationId, userId:request.principal.userId } },
      select:{ id:true, organizationId:true, role:true, status:true, organization:{select:{status:true}} },
    });
    if (!membership || membership.status !== 'ACTIVE' || membership.organization.status !== 'ACTIVE') throw new ForbiddenException('Active organization membership is required');
    if (!roleHasPermissions(membership.role as OrganizationRole, required)) throw new ForbiddenException('Your organization role does not allow this operation');
    request.membership = { id:membership.id, organizationId:membership.organizationId, role:membership.role };
    return true;
  }
}
