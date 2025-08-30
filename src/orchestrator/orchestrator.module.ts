import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DockerManagerService } from './docker-manager.service';
import { EventsGateway } from './events.gateway';
import { OrchestrationService } from './orchestration.service';
import { LlmManagerService } from './llm-manager.service';

@Module({
  imports: [AuthModule],
  providers: [
    DockerManagerService,
    EventsGateway,
    OrchestrationService,
    LlmManagerService,
  ],
  exports: [OrchestrationService],
})
export class OrchestratorModule {}
