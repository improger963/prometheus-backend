import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module'; // <-- 1. Импортируем AuthModule
import { ProjectsService } from './projects.service';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [AuthModule],
  controllers: [ProjectsController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
