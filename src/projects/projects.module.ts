import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AgentsModule } from '../agents/agents.module';
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';
import { ProjectTeamService } from './project-team.service';
import { ProjectTeamController } from './project-team.controller';
import { Project } from './entities/project.entity';
import { Agent } from '../agents/entities/agent.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Agent]),
    AuthModule,
    AgentsModule,
  ],
  controllers: [ProjectsController, ProjectTeamController],
  providers: [ProjectsService, ProjectTeamService],
  exports: [ProjectTeamService],
})
export class ProjectsModule {}
