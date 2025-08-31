import {
  Injectable,
  Logger,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { Agent } from 'src/agents/entities/agent.entity'; // <-- ИЗМЕНЕНИЕ: Импортируем Entity

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
  }

  async generate(agent: Agent, prompt: string): Promise<LlmResponse> {
    const { provider, model } = agent.llmConfig;
    this.logger.log(
      `Маршрутизация запроса к провайдеру: ${provider}, модель: ${model}`,
    );

    switch (provider.toLowerCase()) {
      case 'google':
        return this._callGoogle(prompt, model);
      case 'openai':
        return this._callOpenAI(prompt, model);
      case 'groq':
        return this._callGroq(prompt, model);
      default:
        throw new BadRequestException(
          `Неподдерживаемый LLM провайдер: ${provider}`,
        );
    }
  }

  private async _callGoogle(
    prompt: string,
    model: string,
  ): Promise<LlmResponse> {
    const gemini = this.googleAI.getGenerativeModel({ model });
    const result = await gemini.generateContent(prompt);
    const responseText = result.response.text();
    this.logger.log(`[Google] Сырой ответ: ${responseText}`);
    return this.parseAndValidateResponse(responseText);
  }

  private async _callOpenAI(
    prompt: string,
    model: string,
  ): Promise<LlmResponse> {
    const completion = await this.openAI.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model,
    });
    const responseText = completion.choices[0].message.content;
    this.logger.log(`[OpenAI] Сырой ответ: ${responseText}`);

    // --- ИСПРАВЛЕНИЕ ---
    if (!responseText) {
      throw new InternalServerErrorException(
        'OpenAI API вернул пустой ответ (null content).',
      );
    }
    // -----------------

    return this.parseAndValidateResponse(responseText);
  }

  private async _callGroq(prompt: string, model: string): Promise<LlmResponse> {
    const completion = await this.groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model,
    });
    const responseText = completion.choices[0].message.content;
    this.logger.log(`[Groq] Сырой ответ: ${responseText}`);

    // --- ИСПРАВЛЕНИЕ ---
    if (!responseText) {
      throw new InternalServerErrorException(
        'Groq API вернул пустой ответ (null content).',
      );
    }
    // -----------------

    return this.parseAndValidateResponse(responseText);
  }

  private parseAndValidateResponse(text: string): LlmResponse {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch || !jsonMatch[0]) {
      throw new SyntaxError('В ответе LLM не найден валидный JSON-объект.');
    }
    const parsed = JSON.parse(jsonMatch[0]);
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
