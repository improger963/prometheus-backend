import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { DockerManagerService } from './docker-manager.service';
import { EventsGateway } from './events.gateway';
import { OrchestrationService } from './orchestration.service';
import { OrchestratorController } from './orchestrator.controller';
import { Task, TaskSchema } from '../tasks/schemas/task.schema';
import { Project, ProjectSchema } from 'src/projects/schemas/project.schema';

@Module({
  imports: [
    AuthModule, // Для использования AuthGuard в контроллере
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  providers: [
    DockerManagerService,
    EventsGateway,
    OrchestrationService, // <-- Регистрируем наш новый "мозг"
  ],
  exports: [DockerManagerService, EventsGateway],
  controllers: [OrchestratorController], // <-- Регистрируем контроллер
})
export class OrchestratorModule {}