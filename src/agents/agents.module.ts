import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { Agent, AgentSchema } from './schemas/agent.schema';
import { Project, ProjectSchema } from '../projects/schemas/project.schema'; // <-- 1. Импортируем схему Project

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Agent.name, schema: AgentSchema },
      { name: Project.name, schema: ProjectSchema }, // <-- 2. Регистрируем ProjectSchema здесь
    ]),
  ],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
