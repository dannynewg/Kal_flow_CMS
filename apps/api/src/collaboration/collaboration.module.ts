import { Module } from '@nestjs/common';
import { AuditService } from '../organizations/audit.service';
import { CollaborationController } from './collaboration.controller';
import { CollaborationService } from './collaboration.service';

@Module({ controllers: [CollaborationController], providers: [CollaborationService, AuditService] })
export class CollaborationModule {}
