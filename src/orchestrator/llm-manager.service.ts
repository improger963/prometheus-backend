import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LlmManagerService {
  private readonly logger = new Logger(LlmManagerService.name);

  /**
   * Имитирует отправку промпта в LLM и получение команды.
   * @param prompt - Сформированный промпт для LLM.
   * @returns JSON-объект с командой.
   */
  async generateCommand(
    prompt: string,
  ): Promise<{ command: string; args: string[] }> {
    this.logger.log('--- НАЧАЛО ПРОМПТА ДЛЯ LLM ---');
    this.logger.log(prompt);
    this.logger.log('--- КОНЕЦ ПРОМПТА ДЛЯ LLM ---');
    this.logger.log('Имитирую обращение к LLM API... (задержка 2 сек)');

    // Имитируем сетевую задержку
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Возвращаем жестко закодированную первую команду для демонстрации
    const mockResponse = {
      command: 'ls',
      args: ['-la', '/app'],
    };

    this.logger.log('LLM вернул команду:', mockResponse);
    return mockResponse;
  }
}
