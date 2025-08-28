import { Module } from '@nestjs/common';
import { DockerManagerService } from './docker-manager.service';

@Module({
  providers: [DockerManagerService], // <-- 1. Регистрируем наш сервис
  exports: [DockerManagerService],   // <-- 2. Экспортируем его для использования в других модулях
})
export class OrchestratorModule {}