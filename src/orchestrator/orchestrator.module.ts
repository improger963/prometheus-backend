import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AgentsModule } from '../agents/agents.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { TasksModule } from '../tasks/tasks.module';
import { DockerManagerService } from './docker-manager.service';
import { EventsGateway } from './events.gateway';
import { OrchestrationService } from './orchestration.service';
import { LlmMultiplexerService } from './llm-multiplexer.service';
import { ToolService } from './tool.service';
import { OrchestratorController } from './orchestrator.controller';
import { Task } from '../tasks/entities/task.entity';
import { Project } from '../projects/entities/project.entity';
import { Agent } from '../agents/entities/agent.entity';
import { AgentMemory } from '../agents/entities/agent-memory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Task, Project, Agent, AgentMemory]),
    AuthModule,
    AgentsModule,
    KnowledgeModule,
    TasksModule,
  ],
  controllers: [OrchestratorController],
  providers: [
    DockerManagerService,
    EventsGateway,
    OrchestrationService,
    LlmMultiplexerService,
    ToolService,
  ],
  exports: [OrchestrationService, ToolService],
})
export class OrchestratorModule {}
