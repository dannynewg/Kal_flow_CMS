import { MembershipStatus, OrganizationRole } from '@kal-flow/database';
import { IsEmail, IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateOrganizationDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @MinLength(2) @MaxLength(60) slug!: string;
}
export class AddMembershipDto {
  @IsEmail() email!: string;
  @IsEnum(OrganizationRole) role!: OrganizationRole;
}
export class UpdateMembershipDto {
  @IsOptional() @IsEnum(OrganizationRole) role?: OrganizationRole;
  @IsOptional() @IsEnum(MembershipStatus) status?: MembershipStatus;
}
