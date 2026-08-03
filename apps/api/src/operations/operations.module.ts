import { Module } from '@nestjs/common';
import { AuditService } from '../organizations/audit.service';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({ controllers: [OperationsController], providers: [OperationsService, AuditService] })
export class OperationsModule {}
