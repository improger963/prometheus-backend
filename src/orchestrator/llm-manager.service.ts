import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LlmManagerService {
  private readonly logger = new Logger(LlmManagerService.name);

  async generateCommand(
    prompt: string,
  ): Promise<{ command: string; args: string[] }> {
    this.logger.log('--- LLM ПРОМПТ ---');
    this.logger.log(prompt);
    this.logger.log('--- КОНЕЦ ПРОМПТА ---');
    await new Promise((resolve) => setTimeout(resolve, 1500)); // Имитация задержки
    const mockResponse = { command: 'ls', args: ['-la', '/app'] };
    this.logger.log('LLM вернул команду:', mockResponse);
    return mockResponse;
  }
}
