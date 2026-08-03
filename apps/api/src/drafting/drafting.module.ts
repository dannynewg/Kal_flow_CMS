import { Module } from '@nestjs/common';
import { AuditService } from '../organizations/audit.service';
import { DraftingController } from './drafting.controller';
import { DraftingService } from './drafting.service';

@Module({ controllers: [DraftingController], providers: [DraftingService, AuditService] })
export class DraftingModule {}
