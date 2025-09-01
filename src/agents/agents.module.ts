import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';
import { AgentMemoryService } from './services/agent-memory.service';
import { ReputationService } from './services/reputation.service';
import { Agent } from './entities/agent.entity';
import { AgentMemory } from './entities/agent-memory.entity';
import { Task } from '../tasks/entities/task.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agent, AgentMemory, Task]),
    AuthModule,
  ],
  controllers: [AgentsController],
  providers: [AgentsService, AgentMemoryService, ReputationService],
  exports: [AgentsService, AgentMemoryService, ReputationService],
})
export class AgentsModule {}
