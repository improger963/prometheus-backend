import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrchestrationService } from './orchestration.service';
import { UserDocument } from '../auth/schemas/user.schema';

@UseGuards(AuthGuard('jwt'))
@Controller('orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestrationService: OrchestrationService) {}

  /**
   * Запускает выполнение задачи.
   * @param taskId - ID задачи, которую нужно выполнить.
   */
  @Post('tasks/:taskId/run')
  runTask(@Param('taskId') taskId: string, @Req() req: { user: UserDocument }) {
    // Мы не ждем завершения (await), чтобы сразу вернуть ответ клиенту.
    // Процесс будет выполняться в фоновом режиме, а результаты - транслироваться через WebSocket.
    this.orchestrationService.startTaskExecution(taskId, req.user);

    return {
      message:
        'Команда на выполнение задачи принята. Следите за обновлениями в реальном времени.',
      taskId,
    };
  }
}
