import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness (process up)' })
  live() {
    return { status: 'ok', checks: { process: 'up' } };
  }

  @Get()
  @ApiOperation({ summary: 'Readiness including database ping' })
  async ready() {
    const db = await this.healthService.checkDb();
    if (!db.ok) {
      throw new ServiceUnavailableException({
        status: 'error',
        checks: { database: db },
      });
    }
    return { status: 'ok', checks: { database: db } };
  }
}
