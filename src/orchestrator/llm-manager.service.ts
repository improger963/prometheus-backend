import { Injectable, Logger } from '@nestjs/common';

interface LlmResponse {
  thought: string;
  command: string;
  args: string[];
  finished: boolean;
}

@Injectable()
export class LlmManagerService {
  private readonly logger = new Logger(LlmManagerService.name);
  private callCount = 0;

  // Метод для сброса состояния между задачами (важно для тестов)
  public resetState() {
    this.callCount = 0;
  }

  async generateCommand(prompt: string): Promise<LlmResponse> {
    this.logger.log(`--- LLM ПРОМПТ (Вызов #${this.callCount + 1}) ---`);
    this.logger.log(prompt.substring(0, 400) + '...'); // Логируем только начало для краткости
    this.logger.log('--- КОНЕЦ ПРОМПТА ---');

    await new Promise((resolve) => setTimeout(resolve, 1500));

    this.callCount++;
    let mockResponse: LlmResponse;

    // Имитируем многошаговый диалог
    switch (this.callCount) {
      case 1:
        mockResponse = {
          thought:
            'Отлично, задача ясна. Сначала нужно проверить, что находится в текущей директории, чтобы сориентироваться.',
          command: 'ls',
          args: ['-la', '/app'],
          finished: false,
        };
        break;
      case 2:
        mockResponse = {
          thought:
            "Так, я вижу содержимое репозитория. Теперь, согласно задаче 'Hello, World', мне нужно создать файл 'hello.txt'.",
          command: 'echo',
          args: ['Hello, World!', '>', '/app/hello.txt'],
          finished: false,
        };
        break;
      case 3:
        mockResponse = {
          thought:
            "Файл 'hello.txt' создан. Теперь нужно убедиться, что он действительно там и содержит правильный текст.",
          command: 'cat',
          args: ['/app/hello.txt'],
          finished: false,
        };
        break;
      default:
        mockResponse = {
          thought:
            'Я выполнил все шаги: создал файл и проверил его содержимое. Задача выполнена.',
          command: '',
          args: [],
          finished: true,
        };
        break;
    }

    this.logger.log('LLM вернул ответ:', mockResponse);
    return mockResponse;
  }
}
