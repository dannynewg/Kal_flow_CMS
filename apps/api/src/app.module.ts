import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationGuard } from './auth/authentication.guard';
import { AuthModule } from './auth/auth.module';
import { AuthorizationGuard } from './authorization/authorization.guard';
import { HealthModule } from './health/health.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ContractsModule } from './contracts/contracts.module';
import { PrismaModule } from './prisma/prisma.module';
import { OperationsModule } from './operations/operations.module';

@Module({
  imports: [PrismaModule, AuthModule, HealthModule, OrganizationsModule, ContractsModule, OperationsModule],
  providers: [
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: AuthorizationGuard },
  ],
})
export class AppModule {}
