import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseHealthIndicator } from './indicators/database-health.indicator';
import { MemoryHealthIndicator } from './indicators/memory-health.indicator';
import { CpuHealthIndicator } from './indicators/cpu-health.indicator';

@Module({
  imports: [TerminusModule, HttpModule],
  controllers: [HealthController],
  providers: [HealthService, DatabaseHealthIndicator, MemoryHealthIndicator, CpuHealthIndicator],
  exports: [HealthService],
})
export class HealthModule {}
