import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Определяем интерфейс для строгого контракта ответа
export interface LlmResponse {
  thought: string;
  command: string;
  args: string[];
  finished: boolean;
}

@Injectable()
export class LlmGatewayService {
  private readonly logger = new Logger(LlmGatewayService.name);
  private genAI: GoogleGenerativeAI;
  private readonly modelName = 'gemini-2.5-flash'; // Используем быструю и эффективную модель

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>(
      'GOOGLE_GEMINI_API_KEY',
    );
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateCommand(prompt: string, retryCount = 3): Promise<LlmResponse> {
    this.logger.log(`--- ЗАПРОС К LLM (${this.modelName}) ---`);
    this.logger.log(prompt.substring(0, 500) + '...');

    if (retryCount <= 0) {
      this.logger.error(
        'Превышен лимит попыток получить корректный JSON от LLM.',
      );
      throw new InternalServerErrorException(
        'LLM не смог предоставить корректный ответ.',
      );
    }

    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      const result = await model.generateContent(prompt);
      const responseText = await result.response.text();

      this.logger.log('--- СЫРОЙ ОТВЕТ ОТ LLM ---');
      this.logger.log(responseText);

      return this.parseAndValidateResponse(responseText);
    } catch (error) {
      // Шаг 3: Обработка Ошибок
      if (error instanceof SyntaxError) {
        // Ошибка парсинга JSON
        this.logger.warn(
          `Ошибка парсинга JSON от LLM. Попытка #${4 - retryCount}. Прошу LLM исправить формат.`,
        );
        const fixPrompt = `${prompt}\n\nТвой предыдущий ответ вызвал ошибку парсинга JSON: ${error.message}. Пожалуйста, ответь СТРОГО в формате JSON, без каких-либо вводных слов или оберток типа "json ...".`;
        return this.generateCommand(fixPrompt, retryCount - 1);
      }
      this.logger.error(
        'Критическая ошибка при обращении к Gemini API:',
        error,
      );
      throw new InternalServerErrorException(
        'Ошибка при взаимодействии с LLM API.',
      );
    }
  }

  // Вспомогательный метод для парсинга и валидации
  private parseAndValidateResponse(text: string): LlmResponse {
    // --- НОВЫЙ, БОЛЕЕ НАДЕЖНЫЙ ПАРСЕР ---
    // Ищем JSON-объект, который может быть окружен текстом или markdown
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (!jsonMatch || !jsonMatch[0]) {
      throw new SyntaxError('В ответе LLM не найден валидный JSON-объект.');
    }

    const jsonString = jsonMatch[0];
    const parsed = JSON.parse(jsonString);
    // ------------------------------------

    // Проверяем, что все поля на месте
    if (
      typeof parsed.thought !== 'string' ||
      typeof parsed.command !== 'string' ||
      !Array.isArray(parsed.args) ||
      typeof parsed.finished !== 'boolean'
    ) {
      throw new SyntaxError(
        'JSON-объект в ответе LLM не соответствует требуемому формату LlmResponse.',
      );
    }

    return parsed;
  }
}
