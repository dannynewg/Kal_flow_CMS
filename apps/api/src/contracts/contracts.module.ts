import { Module } from '@nestjs/common';
import { AuditService } from '../organizations/audit.service';
import { ContractRequestsController, ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';
import { DocumentsService } from './documents.service';
import { StorageService } from '../storage/storage.service';

@Module({
  controllers: [ContractRequestsController, ContractsController],
  providers: [ContractsService, DocumentsService, StorageService, AuditService],
})
export class ContractsModule {}
