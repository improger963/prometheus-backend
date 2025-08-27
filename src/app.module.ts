import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectsModule } from './projects/projects.module';
import { AgentsModule } from './agents/agents.module';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';

@Module({
  imports: [ProjectsModule, AgentsModule, TasksModule, AuthModule, OrchestratorModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
