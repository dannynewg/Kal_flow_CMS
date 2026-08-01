import { Controller, Get, Version } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

export interface HealthResponse {
  service: 'api';
  status: 'ok';
  timestamp: string;
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @Version('1')
  @ApiOperation({ summary: 'Confirm that the API process is healthy' })
  @ApiOkResponse({
    schema: {
      example: { service: 'api', status: 'ok', timestamp: '2026-08-01T00:00:00.000Z' },
    },
  })
  check(): HealthResponse {
    return { service: 'api', status: 'ok', timestamp: new Date().toISOString() };
  }
}
