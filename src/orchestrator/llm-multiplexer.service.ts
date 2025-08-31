import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { Mistral } from '@mistralai/mistralai';
import { Agent } from 'src/agents/entities/agent.entity';

export interface LlmResponse {
  thought: string;
  command: string;
  args: string[];
  finished: boolean;
}

@Injectable()
export class LlmMultiplexerService {
  private readonly logger = new Logger(LlmMultiplexerService.name);
  private googleAI: GoogleGenerativeAI;
  private openAI: OpenAI;
  private groq: Groq;
  private mistral: Mistral;

  constructor(private readonly configService: ConfigService) {
    this.googleAI = new GoogleGenerativeAI(
      this.configService.getOrThrow<string>('GOOGLE_API_KEY'),
    );
    this.openAI = new OpenAI({
      apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
    });
    this.groq = new Groq({
      apiKey: this.configService.getOrThrow<string>('GROQ_API_KEY'),
    });
    this.mistral = new Mistral({
      apiKey: this.configService.getOrThrow<string>('MISTRAL_API_KEY'),
    });
  }

  async generate(
    agent: Agent,
    prompt: string,
    retryCount = 3,
  ): Promise<LlmResponse> {
    if (retryCount <= 0) {
      throw new Error(
        'Превышен лимит попыток получить корректный ответ от LLM.',
      );
    }

    const { provider, model } = agent.llmConfig;
    this.logger.log(
      `Маршрутизация запроса к провайдеру: ${provider}, модель: ${model} (Попытка #${4 - retryCount})`,
    );

    try {
      let responseText: string;
      switch (provider.toLowerCase()) {
        case 'google':
          responseText = await this._callGoogle(prompt, model);
          break;
        case 'openai':
          responseText = await this._callOpenAI(prompt, model);
          break;
        case 'groq':
          responseText = await this._callGroq(prompt, model);
          break;
        case 'mistral':
          responseText = await this._callMistral(prompt, model);
          break;
        default:
          throw new BadRequestException(
            `Неподдерживаемый LLM провайдер: ${provider}`,
          );
      }

      this.logger.log(`[${provider}] Сырой ответ: ${responseText}`);
      return this.parseAndHealResponse(responseText);
    } catch (error) {
      this.logger.warn(
        `Ошибка при обработке ответа LLM: ${error.message}. Запускаю повторную попытку...`,
      );
      const fixPrompt = `Твой предыдущий ответ вызвал ошибку: "${error.message}". Напоминаю, твой ответ должен быть СТРОГО в формате JSON: {"thought": "...", "command": "...", "args": [...], "finished": boolean}.`;
      return this.generate(agent, `${prompt}\n\n${fixPrompt}`, retryCount - 1);
    }
  }

  private async _callMistral(prompt: string, model: string): Promise<string> {
    const response = await this.mistral.chat.complete({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'json_object' },
    });

    const responseText = response.choices[0].message.content;

    if (typeof responseText !== 'string') {
      throw new Error(
        'Mistral API вернул ответ в неожиданном формате (не строка).',
      );
    }

    return responseText;
  }

  private async _callGoogle(prompt: string, model: string): Promise<string> {
    const gemini = this.googleAI.getGenerativeModel({ model });
    const result = await gemini.generateContent(prompt);
    return result.response.text();
  }

  private async _callOpenAI(prompt: string, model: string): Promise<string> {
    const completion = await this.openAI.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model,
      response_format: { type: 'json_object' },
    });
    const responseText = completion.choices[0].message.content;
    if (!responseText) throw new Error('OpenAI API вернул пустой ответ.');
    return responseText;
  }

  private async _callGroq(prompt: string, model: string): Promise<string> {
    const completion = await this.groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model,
      response_format: { type: 'json_object' },
    });
    const responseText = completion.choices[0].message.content;
    if (!responseText) throw new Error('Groq API вернул пустой ответ.');
    return responseText;
  }

  private parseAndHealResponse(text: string): LlmResponse {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch || !jsonMatch[0]) {
      throw new Error('В ответе LLM не найден JSON-объект.');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const healedResponse: LlmResponse = {
      thought: parsed.thought || '',
      command: parsed.command || '',
      args: parsed.args || [],
      finished: typeof parsed.finished === 'boolean' ? parsed.finished : false,
    };
    if (
      !Array.isArray(healedResponse.args) ||
      !healedResponse.args.every((arg) => typeof arg === 'string')
    ) {
      this.logger.warn(
        'Поле "args" в ответе LLM не является массивом строк. Преобразовано в пустой массив.',
      );
      healedResponse.args = [];
    }
    this.logger.log('"Исцеленный" и валидный ответ от LLM:', healedResponse);
    return healedResponse;
  }
}
