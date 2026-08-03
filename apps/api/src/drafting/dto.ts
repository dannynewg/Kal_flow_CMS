import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsIn, IsObject, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { ContractRiskLevel } from '@kal-flow/database';

export class CreateClauseDto {
  @Matches(/^[A-Z0-9][A-Z0-9_-]{1,39}$/) code!: string;
  @IsString() @MinLength(2) @MaxLength(80) category!: string;
  @IsString() @MinLength(3) @MaxLength(180) titleEn!: string;
  @IsString() @MinLength(2) @MaxLength(180) titleAm!: string;
  @IsString() @MinLength(20) @MaxLength(100000) bodyEn!: string;
  @IsString() @MinLength(10) @MaxLength(100000) bodyAm!: string;
  @IsOptional() @IsString() @MaxLength(2000) guidance?: string;
  @IsOptional() @IsEnum(ContractRiskLevel) riskLevel?: ContractRiskLevel;
}

export class UpdateClauseDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) category?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(180) titleEn?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) titleAm?: string;
  @IsOptional() @IsString() @MinLength(20) @MaxLength(100000) bodyEn?: string;
  @IsOptional() @IsString() @MinLength(10) @MaxLength(100000) bodyAm?: string;
  @IsOptional() @IsString() @MaxLength(2000) guidance?: string;
  @IsOptional() @IsEnum(ContractRiskLevel) riskLevel?: ContractRiskLevel;
}

export class TemplateClauseDto {
  @IsUUID() clauseId!: string;
  @IsOptional() @IsBoolean() isRequired?: boolean;
}

export class CreateTemplateDto {
  @Matches(/^[A-Z0-9][A-Z0-9_-]{1,39}$/) code!: string;
  @IsString() @MinLength(2) @MaxLength(80) contractType!: string;
  @IsString() @MinLength(3) @MaxLength(180) nameEn!: string;
  @IsString() @MinLength(2) @MaxLength(180) nameAm!: string;
  @IsOptional() @IsString() @MaxLength(2000) descriptionEn?: string;
  @IsOptional() @IsString() @MaxLength(2000) descriptionAm?: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => TemplateClauseDto)
  clauses!: TemplateClauseDto[];
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) contractType?: string;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(180) nameEn?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(180) nameAm?: string;
  @IsOptional() @IsString() @MaxLength(2000) descriptionEn?: string;
  @IsOptional() @IsString() @MaxLength(2000) descriptionAm?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => TemplateClauseDto)
  clauses?: TemplateClauseDto[];
}

export class InstantiateTemplateDto {
  @IsUUID() templateId!: string;
  @IsIn(['en', 'am', 'bilingual']) language!: 'en' | 'am' | 'bilingual';
  @IsOptional() @IsObject() variables?: Record<string, string>;
  @IsOptional() @IsString() @MaxLength(1000) summary?: string;
}
