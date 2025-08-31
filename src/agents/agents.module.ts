import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { Agent } from './entities/agent.entity';
import { Project } from '../projects/entities/project.entity'; // <-- Импортируем Project Entity

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, Project]), // <-- Регистрируем обе Entity
    AuthModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
