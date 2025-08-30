import { Controller, Get, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { EventsGateway } from './orchestrator/events.gateway'; // <-- 1. Импортируем наш шлюз

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly eventsGateway: EventsGateway, // <-- 2. Инжектируем его
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- ВРЕМЕННЫЙ МЕТОД ДЛЯ ТЕСТИРОВАНИЯ ---
  @Get('test-ws/:projectId')
  testWebSocket(@Param('projectId') projectId: string) {
    const event = 'agentLog';
    const payload = {
      message: `Агент в проекте ${projectId} начал работу...`,
      timestamp: new Date(),
    };

    this.eventsGateway.sendToProjectRoom(projectId, event, payload);

    return {
      success: true,
      message: `Тестовое событие отправлено в комнату ${projectId}`,
    };
  }
}
