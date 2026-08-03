import { NotificationChannel, OperationalAlertSeverity, OperationalAlertType } from '@kal-flow/database';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateNotificationRuleDto {
  @IsString() @MinLength(3) @MaxLength(120) name!: string;
  @IsEnum(NotificationChannel) channel!: NotificationChannel;
  @IsString() @MinLength(3) @MaxLength(254) recipient!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4) @IsEnum(OperationalAlertType, { each: true }) alertTypes!: OperationalAlertType[];
  @IsOptional() @IsEnum(OperationalAlertSeverity) minimumSeverity?: OperationalAlertSeverity;
  @IsOptional() @IsBoolean() enabled?: boolean;
}

export class UpdateNotificationRuleDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(120) name?: string;
  @IsOptional() @IsEnum(NotificationChannel) channel?: NotificationChannel;
  @IsOptional() @IsString() @MinLength(3) @MaxLength(254) recipient?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(4) @IsEnum(OperationalAlertType, { each: true }) alertTypes?: OperationalAlertType[];
  @IsOptional() @IsEnum(OperationalAlertSeverity) minimumSeverity?: OperationalAlertSeverity;
  @IsOptional() @IsBoolean() enabled?: boolean;
}
