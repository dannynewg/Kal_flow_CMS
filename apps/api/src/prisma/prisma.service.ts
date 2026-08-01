import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createPrismaClient } from '@kal-flow/database';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client = createPrismaClient();
  async onModuleDestroy(): Promise<void> { await this.client.$disconnect(); }
}
