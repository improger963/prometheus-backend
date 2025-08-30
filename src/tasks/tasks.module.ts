import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [AuthModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
