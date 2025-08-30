import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AgentsService } from './agents.service';
import { AgentsController } from './agents.controller';

@Module({
  imports: [AuthModule],
  controllers: [AgentsController],
  providers: [AgentsService],
})
export class AgentsModule {}
