import { Module } from '@nestjs/common';
import { AuditService } from '../organizations/audit.service';
import { ContractRequestsController, ContractsController } from './contracts.controller';
import { ContractsService } from './contracts.service';

@Module({
  controllers: [ContractRequestsController, ContractsController],
  providers: [ContractsService, AuditService],
})
export class ContractsModule {}
