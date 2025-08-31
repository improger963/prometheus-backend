import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DockerManagerService } from './docker-manager.service';
import { EventsGateway } from './events.gateway';
import { OrchestrationService } from './orchestration.service';
import { LlmMultiplexerService } from './llm-multiplexer.service';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AgentMemoryService } from './agent-memory.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Project, Agent]), // <-- Регистрируем все нужные Entity
    AuthModule,
  ],
  providers: [
    DockerManagerService,
    EventsGateway,
    OrchestrationService,
    LlmMultiplexerService,
    AgentMemoryService,
  ],
  exports: [OrchestrationService],
})
export class OrchestratorModule {}
