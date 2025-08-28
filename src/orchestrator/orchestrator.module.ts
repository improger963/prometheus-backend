import { Module } from '@nestjs/common';
import { DockerManagerService } from './docker-manager.service';
import { EventsGateway } from './events.gateway'; // <-- 1. Импортируем наш шлюз

@Module({
  providers: [
    DockerManagerService,
    EventsGateway // <-- 2. Регистрируем EventsGateway как провайдер
  ],
  exports: [
    DockerManagerService,
    EventsGateway // <-- 3. Экспортируем его для использования в других модулях
  ],
})
export class OrchestratorModule {}