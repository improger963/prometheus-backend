import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { DockerManagerService } from './docker-manager.service';
import { EventsGateway } from './events.gateway';
import { OrchestrationService } from './orchestration.service';
import { OrchestratorController } from './orchestrator.controller';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Project, ProjectSchema } from 'src/projects/schemas/project.schema';
import { LlmManagerService } from './llm-manager.service'; // <-- Добавляем
import { Agent, AgentSchema } from 'src/agents/schemas/agent.schema'; // <-- Добавляем

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Agent.name, schema: AgentSchema }, // <-- Добавляем
    ]),
  ],
  providers: [
    DockerManagerService,
    EventsGateway,
    OrchestrationService,
    LlmManagerService, // <-- Регистрируем
  ],
  exports: [DockerManagerService, EventsGateway],
  controllers: [OrchestratorController], // <-- Регистрируем контроллер
})
export class OrchestratorModule {}
