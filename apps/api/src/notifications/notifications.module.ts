import { Module } from '@nestjs/common';
import { AuditService } from '../organizations/audit.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({ controllers: [NotificationsController], providers: [NotificationsService, AuditService] })
export class NotificationsModule {}
