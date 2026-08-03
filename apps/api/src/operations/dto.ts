import { ObligationKind, ObligationPriority, ObligationStatus, RenewalDecision, RenewalType } from '@kal-flow/database';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateObligationDto {
  @IsUUID() ownerMembershipId!: string;
  @IsEnum(ObligationKind) kind!: ObligationKind;
  @IsString() @MinLength(3) @MaxLength(180) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsDateString() dueDate!: string;
  @IsEnum(ObligationPriority) priority!: ObligationPriority;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(8) @IsInt({ each: true }) @Min(0, { each: true }) @Max(365, { each: true }) reminderDays?: number[];
}

export class UpdateObligationDto {
  @IsOptional() @IsUUID() ownerMembershipId?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(180) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsEnum(ObligationPriority) priority?: ObligationPriority;
  @IsOptional() @IsEnum(ObligationStatus) status?: ObligationStatus;
}

export class CompleteObligationDto {
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}

export class UpsertRenewalDto {
  @IsEnum(RenewalType) renewalType!: RenewalType;
  @IsDateString() renewalDate!: string;
  @IsOptional() @IsDateString() noticeDeadline?: string;
  @IsOptional() @IsInt() @Min(0) @Max(730) noticePeriodDays?: number;
}

export class DecideRenewalDto {
  @IsEnum(RenewalDecision) decision!: RenewalDecision;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
}
