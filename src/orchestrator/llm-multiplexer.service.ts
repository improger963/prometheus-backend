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

export interface LlmConfig {
  provider: 'google' | 'openai' | 'groq' | 'mistral';
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ProviderInfo {
  name: string;
  models: string[];
  defaultModel: string;
  maxTokens: number;
}

@Injectable()
export class LlmMultiplexerService {
  private readonly logger = new Logger(LlmMultiplexerService.name);
  private googleAI: GoogleGenerativeAI;
  private openAI: OpenAI;
  private groq: Groq;
  private mistral: Mistral;

  // Provider configurations
  private readonly providers: Record<string, ProviderInfo> = {
    google: {
      name: 'Google Gemini',
      models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro'],
      defaultModel: 'gemini-1.5-pro',
      maxTokens: 1048576,
    },
    openai: {
      name: 'OpenAI',
      models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'gpt-4o'],
      defaultModel: 'gpt-4-turbo',
      maxTokens: 128000,
    },
    groq: {
      name: 'Groq',
      models: ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768'],
      defaultModel: 'llama3-70b-8192',
      maxTokens: 32768,
    },
    mistral: {
      name: 'Mistral AI',
      models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest'],
      defaultModel: 'mistral-large-latest',
      maxTokens: 32768,
    },
  };

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
    options?: { modelOverride?: string; retryCount?: number },
  ): Promise<LlmResponse> {
    const retryCount = options?.retryCount ?? 3;
    if (retryCount <= 0) {
      throw new Error(
        'Превышен лимит попыток получить корректный ответ от LLM.',
      );
    }

    const model = options?.modelOverride || agent.llmConfig.model;
    const provider = agent.llmConfig.provider;
    const temperature = agent.llmConfig.temperature || 0.7;
    const maxTokens = agent.llmConfig.maxTokens || this.providers[provider]?.maxTokens || 4096;

    this.logger.log(
      `Маршрутизация: ${provider}, модель: ${model}, temp: ${temperature} (Попытка #${4 - retryCount})`,
    );

    try {
      let responseText: string;
      switch (provider.toLowerCase()) {
        case 'google':
          responseText = await this._callGoogle(prompt, model, { temperature, maxTokens });
          break;
        case 'openai':
          responseText = await this._callOpenAI(prompt, model, { temperature, maxTokens });
          break;
        case 'groq':
          responseText = await this._callGroq(prompt, model, { temperature, maxTokens });
          break;
        case 'mistral':
          responseText = await this._callMistral(prompt, model, { temperature, maxTokens });
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
      return this.generate(agent, `${prompt}\n\n${fixPrompt}`, {
        retryCount: retryCount - 1,
      });
    }
  }

  private async _callMistral(
    prompt: string,
    model: string,
    options: { temperature: number; maxTokens: number },
  ): Promise<string> {
    const response = await this.mistral.chat.complete({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      responseFormat: { type: 'json_object' },
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    });

    const responseText = response.choices[0].message.content;

    if (typeof responseText !== 'string') {
      throw new Error(
        'Mistral API вернул ответ в неожиданном формате (не строка).',
      );
    }

    return responseText;
  }

  private async _callGoogle(
    prompt: string,
    model: string,
    options: { temperature: number; maxTokens: number },
  ): Promise<string> {
    const gemini = this.googleAI.getGenerativeModel({ 
      model,
      generationConfig: {
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
      },
    });
    const result = await gemini.generateContent(prompt);
    return result.response.text();
  }

  private async _callOpenAI(
    prompt: string,
    model: string,
    options: { temperature: number; maxTokens: number },
  ): Promise<string> {
    const completion = await this.openAI.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model,
      response_format: { type: 'json_object' },
      temperature: options.temperature,
      max_tokens: options.maxTokens,
    });
    const responseText = completion.choices[0].message.content;
    if (!responseText) throw new Error('OpenAI API вернул пустой ответ.');
    return responseText;
  }

  private async _callGroq(
    prompt: string,
    model: string,
    options: { temperature: number; maxTokens: number },
  ): Promise<string> {
    const completion = await this.groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model,
      response_format: { type: 'json_object' },
      temperature: options.temperature,
      max_tokens: options.maxTokens,
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

  // NEW: Provider management methods
  async validateProviderCredentials(provider: string): Promise<boolean> {
    try {
      const testPrompt = 'Test connection. Respond with: {"status": "ok"}';
      switch (provider.toLowerCase()) {
        case 'google':
          await this._callGoogle(testPrompt, 'gemini-pro', { temperature: 0.1, maxTokens: 100 });
          return true;
        case 'openai':
          await this._callOpenAI(testPrompt, 'gpt-3.5-turbo', { temperature: 0.1, maxTokens: 100 });
          return true;
        case 'groq':
          await this._callGroq(testPrompt, 'llama3-8b-8192', { temperature: 0.1, maxTokens: 100 });
          return true;
        case 'mistral':
          await this._callMistral(testPrompt, 'mistral-small-latest', { temperature: 0.1, maxTokens: 100 });
          return true;
        default:
          return false;
      }
    } catch (error) {
      this.logger.warn(`Provider ${provider} validation failed:`, error.message);
      return false;
    }
  }

  async getProviderModels(provider: string): Promise<string[]> {
    const providerInfo = this.providers[provider.toLowerCase()];
    return providerInfo ? providerInfo.models : [];
  }

  getAvailableProviders(): ProviderInfo[] {
    return Object.entries(this.providers).map(([key, info]) => ({
      ...info,
      name: key,
    }));
  }

  getProviderInfo(provider: string): ProviderInfo | null {
    return this.providers[provider.toLowerCase()] || null;
  }

  async routeRequest(agent: Agent, prompt: string): Promise<LlmResponse> {
    return this.generate(agent, prompt);
  }
}
