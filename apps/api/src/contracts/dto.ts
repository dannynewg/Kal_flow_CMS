import { ContractRiskLevel, DocumentCategory, DocumentConfidentiality, OrganizationRole } from '@kal-flow/database';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsEnum, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContractRequestDto {
  @IsUUID() departmentId!: string;
  @IsString() @MinLength(3) @MaxLength(180) title!: string;
  @IsString() @MinLength(10) @MaxLength(4000) description!: string;
  @IsString() @MinLength(2) @MaxLength(80) contractType!: string;
  @IsString() @MinLength(2) @MaxLength(180) counterpartyName!: string;
  @IsOptional() @Matches(/^\d+$/) estimatedValueMinor?: string;
  @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsDateString() desiredEffectiveDate?: string;
}

export class UpdateContractRequestDto {
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(180) title?: string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(4000) description?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) contractType?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) counterpartyName?: string;
  @IsOptional() @Matches(/^\d+$/) estimatedValueMinor?: string;
  @IsOptional() @Matches(/^[A-Z]{3}$/) currency?: string;
  @IsOptional() @IsDateString() desiredEffectiveDate?: string;
}

export class TriageContractRequestDto {
  @IsUUID() assignedMembershipId!: string;
  @IsEnum(ContractRiskLevel) riskLevel!: ContractRiskLevel;
}

export class ConvertContractRequestDto {
  @IsUUID() ownerMembershipId!: string;
}

export class CreateContractVersionDto {
  @IsString() @MinLength(3) @MaxLength(180) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) summary?: string;
  @IsString() @MinLength(20) @MaxLength(500000) content!: string;
  @IsOptional() @IsString() @MaxLength(500) changeNote?: string;
}

export class ReviewStepDto {
  @IsString() @MinLength(2) @MaxLength(120) name!: string;
  @IsEnum(OrganizationRole) requiredRole!: OrganizationRole;
  @IsOptional() @IsUUID() assignedMembershipId?: string;
}

export class StartContractReviewDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12) @ValidateNested({ each: true }) @Type(() => ReviewStepDto)
  steps!: ReviewStepDto[];
}

export class DecideReviewStepDto {
  @IsIn(['APPROVED', 'CHANGES_REQUESTED']) decision!: 'APPROVED' | 'CHANGES_REQUESTED';
  @IsOptional() @IsString() @MaxLength(2000) comment?: string;
}

export class ActivateContractDto {
  @IsDateString() effectiveDate!: string;
  @IsOptional() @IsDateString() expirationDate?: string;
}

export class SearchDocumentsDto {
  @IsOptional() @IsString() @MaxLength(120) query?: string;
  @IsOptional() @IsEnum(DocumentCategory) category?: DocumentCategory;
  @IsOptional() @IsEnum(DocumentConfidentiality) confidentiality?: DocumentConfidentiality;
  @IsOptional() @IsIn(['AVAILABLE', 'ARCHIVED', 'QUARANTINED']) status?: 'AVAILABLE' | 'ARCHIVED' | 'QUARANTINED';
}

export class UpdateDocumentDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) title?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsEnum(DocumentCategory) category?: DocumentCategory;
  @IsOptional() @IsEnum(DocumentConfidentiality) confidentiality?: DocumentConfidentiality;
  @IsOptional() @IsArray() @ArrayMaxSize(12) @IsString({ each: true }) @MaxLength(40, { each: true }) tags?: string[];
  @IsOptional() @IsDateString() retentionUntil?: string;
}
