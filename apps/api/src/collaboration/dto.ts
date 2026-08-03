import { CounterpartyStatus, CounterpartyType, NegotiationItemStatus } from '@kal-flow/database';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsEmail, IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateContactDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
}

export class CreateCounterpartyDto {
  @IsString() @MinLength(2) @MaxLength(200) legalName!: string;
  @IsOptional() @IsString() @MaxLength(200) tradeName?: string;
  @IsEnum(CounterpartyType) type!: CounterpartyType;
  @IsOptional() @IsString() @MaxLength(40) tin?: string;
  @IsOptional() @IsString() @MaxLength(80) registrationNumber?: string;
  @IsOptional() @IsString() @MaxLength(2) country?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(2000) riskNote?: string;
}

export class UpdateCounterpartyDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(200) legalName?: string;
  @IsOptional() @IsString() @MaxLength(200) tradeName?: string;
  @IsOptional() @IsEnum(CounterpartyType) type?: CounterpartyType;
  @IsOptional() @IsEnum(CounterpartyStatus) status?: CounterpartyStatus;
  @IsOptional() @IsString() @MaxLength(40) tin?: string;
  @IsOptional() @IsString() @MaxLength(80) registrationNumber?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(500) address?: string;
  @IsOptional() @IsString() @MaxLength(2000) riskNote?: string;
}

export class LinkCounterpartyDto { @IsUUID() counterpartyId!: string; }

export class CreateNegotiationDto {
  @IsUUID() contractId!: string;
  @IsUUID() contractVersionId!: string;
  @IsOptional() @IsUUID() counterpartyId?: string;
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
}

export class AddNegotiationMessageDto {
  @IsOptional() @IsString() @MaxLength(120) clauseReference?: string;
  @IsString() @MinLength(2) @MaxLength(4000) message!: string;
  @IsOptional() @IsString() @MaxLength(12000) proposedText?: string;
}

export class ResolveNegotiationMessageDto { @IsEnum(NegotiationItemStatus) status!: NegotiationItemStatus; }

export class SignatureSignerDto {
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsEmail() @MaxLength(254) email!: string;
  @IsOptional() @IsString() @MaxLength(120) role?: string;
  @IsOptional() @IsUUID() counterpartyContactId?: string;
  @IsInt() @Min(1) @Max(20) sequence!: number;
}

export class CreateSignaturePacketDto {
  @IsUUID() contractId!: string;
  @IsUUID() contractVersionId!: string;
  @IsString() @MinLength(3) @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) message?: string;
  @IsOptional() @IsDateString() expiresAt?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(20) @ValidateNested({ each: true }) @Type(() => SignatureSignerDto) signers!: SignatureSignerDto[];
}

export class DeclineSignatureDto { @IsOptional() @IsString() @MaxLength(1000) reason?: string; }

export class SignatureProviderEventDto {
  @IsString() @MinLength(6) @MaxLength(200) eventId!: string;
  @IsUUID() packetId!: string;
  @IsEmail() signerEmail!: string;
  @IsIn(['VIEWED', 'SIGNED', 'DECLINED']) status!: 'VIEWED' | 'SIGNED' | 'DECLINED';
  @IsOptional() @IsString() @MaxLength(200) providerPacketId?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
}
