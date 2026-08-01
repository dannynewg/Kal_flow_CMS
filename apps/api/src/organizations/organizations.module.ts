import { Module } from '@nestjs/common';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';
import { InvitationAcceptanceController, InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  controllers: [OrganizationsController, DepartmentsController, InvitationsController, InvitationAcceptanceController, AuditController],
  providers: [OrganizationsService, DepartmentsService, InvitationsService, AuditService],
})
export class OrganizationsModule {}
