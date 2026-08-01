import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../auth/principal';
import { PrismaService } from '../prisma/prisma.service';
import type { AddMembershipDto, CreateOrganizationDto, UpdateMembershipDto } from './dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma:PrismaService) {}

  async create(principal:AuthenticatedPrincipal, input:CreateOrganizationDto) {
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const organization = await tx.organization.create({data:{name:input.name.trim(),slug:input.slug}});
        await tx.membership.create({data:{organizationId:organization.id,userId:principal.userId,role:'OWNER'}});
        return organization;
      });
    } catch (error) {
      if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') throw new ConflictException('Organization slug is already in use');
      throw error;
    }
  }

  list(principal:AuthenticatedPrincipal) {
    return this.prisma.client.organization.findMany({
      where:{memberships:{some:{userId:principal.userId,status:'ACTIVE'}}},
      include:{memberships:{where:{userId:principal.userId},select:{id:true,role:true,status:true}}},
      orderBy:{name:'asc'},
    });
  }

  async get(organizationId:string) {
    const result = await this.prisma.client.organization.findUnique({where:{id:organizationId}});
    if (!result) throw new NotFoundException('Organization not found');
    return result;
  }

  listMembers(organizationId:string) {
    return this.prisma.client.membership.findMany({where:{organizationId},include:{user:{select:{id:true,email:true,displayName:true}}},orderBy:{createdAt:'asc'}});
  }

  async addMember(organizationId:string,input:AddMembershipDto) {
    const user = await this.prisma.client.user.findFirst({where:{email:{equals:input.email.toLowerCase(),mode:'insensitive'}}});
    if (!user) throw new BadRequestException('The user must sign in once before membership can be assigned');
    if (input.role === 'OWNER') throw new BadRequestException('Ownership transfer requires a dedicated workflow');
    try { return await this.prisma.client.membership.create({data:{organizationId,userId:user.id,role:input.role},include:{user:{select:{id:true,email:true,displayName:true}}}}); }
    catch (error) { if (typeof error === 'object' && error && 'code' in error && error.code === 'P2002') throw new ConflictException('The user is already a member'); throw error; }
  }

  async updateMember(organizationId:string,membershipId:string,input:UpdateMembershipDto) {
    const existing = await this.prisma.client.membership.findFirst({where:{id:membershipId,organizationId}});
    if (!existing) throw new NotFoundException('Membership not found');
    if (existing.role === 'OWNER') throw new ForbiddenException('The owner membership cannot be changed through this endpoint');
    return this.prisma.client.membership.update({where:{id:membershipId},data:{...(input.role ? {role:input.role} : {}),...(input.status ? {status:input.status} : {})}});
  }
}
