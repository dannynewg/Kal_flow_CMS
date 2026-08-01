import { MembershipStatus, OrganizationRole, OrganizationStatus } from '@kal-flow/database';
import { IsBoolean, IsEmail, IsEnum, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MinLength(2) @MaxLength(60) slug!: string;
}
export class UpdateOrganizationDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsString() @MaxLength(80) timezone?: string;
  @IsOptional() @IsObject() settings?: Record<string, string | number | boolean | null>;
  @IsOptional() @IsEnum(OrganizationStatus) status?: OrganizationStatus;
}
export class AddMembershipDto {
  @IsEmail() email!: string;
  @IsEnum(OrganizationRole) role!: OrganizationRole;
}
export class UpdateMembershipDto {
  @IsOptional() @IsEnum(OrganizationRole) role?: OrganizationRole;
  @IsOptional() @IsEnum(MembershipStatus) status?: MembershipStatus;
}
export class TransferOwnershipDto {
  @IsUUID() membershipId!: string;
}
export class CreateDepartmentDto {
  @IsString() @Matches(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/) @MinLength(2) @MaxLength(20) code!: string;
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() parentId?: string;
}
export class UpdateDepartmentDto {
  @IsOptional() @IsString() @Matches(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/) @MinLength(2) @MaxLength(20) code?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(120) name?: string;
  @IsOptional() @IsString() @MaxLength(500) description?: string;
  @IsOptional() @IsUUID() parentId?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
export class AssignDepartmentMemberDto {
  @IsUUID() membershipId!: string;
  @IsOptional() @IsBoolean() isManager?: boolean;
}
export class CreateInvitationDto {
  @IsEmail() email!: string;
  @IsEnum(OrganizationRole) role!: OrganizationRole;
}
export class AcceptInvitationDto {
  @IsString() @MinLength(32) @MaxLength(256) token!: string;
}
