import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import {
  DockerConnectionError,
  DockerManagerService,
  ImagePullError,
} from './docker-manager.service';
import { EventsGateway } from './events.gateway';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { LlmMultiplexerService } from './llm-multiplexer.service';
import { AgentMemoryService } from '../agents/services/agent-memory.service';
import { ToolService, ToolCall } from './tool.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { Agent } from 'src/agents/entities/agent.entity';
import { Project } from 'src/projects/entities/project.entity';
import { AgentMemory } from '../agents/entities/agent-memory.entity';

@Injectable()
export class OrchestrationService {
  private readonly logger = new Logger(OrchestrationService.name);

  constructor(
    private readonly dockerManager: DockerManagerService,
    private readonly eventsGateway: EventsGateway,
    private readonly llmMultiplexer: LlmMultiplexerService,
    private readonly agentMemoryService: AgentMemoryService,
    private readonly toolService: ToolService,
    private readonly knowledgeService: KnowledgeService,
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
  ) {}

  @OnEvent('task.created')
  async handleTaskCreated(payload: { taskId: string }) {
    this.logger.log(
      `Перехвачено событие 'task.created' для задачи: ${payload.taskId}`,
    );
    this.startTaskExecution(payload.taskId);
  }

  async startTaskExecution(taskId: string): Promise<void> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId },
      relations: ['project'],
    });

    if (!task || !task.project || !task.assigneeIds || task.assigneeIds.length === 0) {
      this.logger.error(
        `Задача ${taskId} не найдена или не имеет полного набора данных (проект/исполнитель).`,
      );
      if (task && task.project) {
        this._logToProject(
          task.project.id,
          `[Оркестратор]: Ошибка! Задача или назначенный агент не найдены.`,
          'system',
          'System',
        );
        await this.updateTaskStatus(
          taskId,
          task.project.id,
          TaskStatus.FAILED,
          'system',
          'System',
        );
      }
      return;
    }

    const { project } = task;
    const projectId = project.id;
    
    // For multi-agent tasks, use the first assigned agent as primary
    const primaryAgentId = task.assigneeIds[0];
    // TODO: In full implementation, fetch agent details from database
    const agentName = `Agent-${primaryAgentId.substring(0, 8)}`; // Mock for now
    const agentId = primaryAgentId;

    this.logger.log(
      `[ОРКЕСТРАТОР] Запускаю задачу: "${task.title}" в проекте "${project.name}" для агента "${agentName}"`,
    );
    this._logToProject(
      projectId,
      `[Оркестратор]: Принял задачу "${task.title}" в работу.`,
      agentId,
      agentName,
    );

    let containerId: string | null = null;

    try {
      await this.updateTaskStatus(
        taskId,
        projectId,
        TaskStatus.IN_PROGRESS,
        agentId,
        agentName,
      );

      const baseImage =
        project.baseDockerImage || 'vibe381/prometheus-base:latest';
      this._logToProject(
        projectId,
        `[Docker]: Создаю среду на базе образа "${baseImage}"...`,
        agentId,
        agentName,
      );

      const envVars = project.gitAccessToken
        ? [`GIT_ACCESS_TOKEN=${project.gitAccessToken}`]
        : [];
      containerId = await this.dockerManager.createAndStartContainer(
        baseImage,
        envVars,
      );
      this._logToProject(
        projectId,
        `[Docker]: Среда создана. ID: ${containerId.substring(0, 12)}`,
        agentId,
        agentName,
      );

      // --- ФАЗА 1: ПОДГОТОВКА РЕПОЗИТОРИЯ ---
      this._logToProject(
        projectId,
        `[Git]: Клонирую и настраиваю репозиторий...`,
        agentId,
        agentName,
      );
      const repoUrl = new URL(project.gitRepositoryURL || 'https://github.com/default/repo.git');
      if (project.gitAccessToken) {
        repoUrl.username = project.gitAccessToken;
      }

      // Клонируем в /app. Эта команда выполняется из корня '/'.
      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['git', 'clone', repoUrl.toString(), '.'],
        agentId,
        agentName,
        '/app',
      );

      // Настраиваем Git. Эти команды выполняются уже в '/app'.
      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['git', 'config', 'user.name', `"${agentName}"`],
        agentId,
        agentName,
        '/app',
      );
      await this.executeAndLogCommand(
        containerId,
        projectId,
        ['git', 'config', 'user.email', `"${agentId}@prometheus.dev"`],
        agentId,
        agentName,
        '/app',
      );

      this._logToProject(
        projectId,
        `[Git]: Настройка завершена.`,
        agentId,
        agentName,
      );

      // --- ФАЗА 2: ИНИЦИАЛИЗАЦИЯ ПАМЯТИ АГЕНТА ---
      this._logToProject(
        projectId,
        `[Память]: Инициализирую память агента для задачи...`,
        agentId,
        agentName,
      );
      
      const memory = await this.agentMemoryService.initializeMemory(
        agentId,
        taskId,
        `${task.title}: ${task.description}`,
      );

      // --- ФАЗА 3: РАБОТА АГЕНТА С ПАМЯТЬЮ ---
      let maxIterations = 20;

      while (maxIterations > 0) {
        maxIterations--;

        // Получаем оптимизированный контекст из памяти
        const memoryContext = await this.agentMemoryService.getOptimizedContext(memory.id);
        
        const currentPrompt = await this.buildIterativePromptWithMemory(
          { id: agentId, role: 'Developer' } as Agent, // Mock agent
          task,
          memoryContext,
        );
        
        const llmResponse = await this.llmMultiplexer.generate(
          { id: agentId, role: 'Developer', llmConfig: { provider: 'openai', model: 'gpt-4-turbo' } } as Agent,
          currentPrompt,
        );
        
        this._logToProject(
          projectId,
          `[Мысль]: ${llmResponse.thought}`,
          agentId,
          agentName,
        );

        // Check for tool calls in LLM response
        const toolCall = await this.toolService.detectToolCall(llmResponse.thought);
        if (toolCall) {
          this._logToProject(
            projectId,
            `[Инструмент]: Обнаружен вызов ${toolCall.name}`,
            agentId,
            agentName,
          );
          
          const toolResult = await this.toolService.executeToolCall(toolCall, {
            containerId,
            workingDir: '/app',
            agentId,
            taskId,
          });
          
          if (toolResult.success) {
            this._logToProject(
              projectId,
              `[Инструмент]: ${toolCall.name} выполнен успешно`,
              agentId,
              agentName,
            );
            
            // Save tool execution in memory
            await this.agentMemoryService.appendToHistory(memory.id, {
              action: `TOOL: ${toolCall.name}(${JSON.stringify(toolCall.arguments)})`,
              result: toolResult.result,
              tokenCount: this.estimateTokenCount(toolResult.result),
            });
          } else {
            this._logToProject(
              projectId,
              `[Инструмент]: Ошибка в ${toolCall.name}: ${toolResult.error}`,
              agentId,
              agentName,
            );
            
            await this.agentMemoryService.appendToHistory(memory.id, {
              action: `TOOL: ${toolCall.name}(${JSON.stringify(toolCall.arguments)})`,
              result: `ОШИБКА: ${toolResult.error}`,
              tokenCount: this.estimateTokenCount(toolResult.error || ''),
            });
          }
          
          // Continue to next iteration with tool result
          continue;
        }

        if (llmResponse.finished || !llmResponse.command) {
          this._logToProject(
            projectId,
            `[Оркестратор]: Агент считает, что задача выполнена.`,
            agentId,
            agentName,
          );
          break;
        }

        try {
          // Оборачиваем команду от LLM в shell для поддержки сложных конструкций
          const commandWithShell = [
            'sh',
            '-c',
            `${llmResponse.command} ${llmResponse.args.join(' ')}`,
          ];
          const commandResult = await this.executeAndLogCommand(
            containerId,
            projectId,
            commandWithShell,
            agentId,
            agentName,
            '/app',
          );
          
          // Сохраняем успешный шаг в памяти
          await this.agentMemoryService.appendToHistory(memory.id, {
            action: `${llmResponse.command} ${llmResponse.args.join(' ')}`,
            result: commandResult || '(пустой вывод)',
            tokenCount: this.estimateTokenCount(llmResponse.thought + commandResult),
          });
          
        } catch (error) {
          // Сохраняем ошибку в памяти
          await this.agentMemoryService.appendToHistory(memory.id, {
            action: `${llmResponse.command} ${llmResponse.args.join(' ')}`,
            result: `ОШИБКА: ${error.message}`,
            tokenCount: this.estimateTokenCount(llmResponse.thought + error.message),
          });
        }
      }

      if (maxIterations <= 0) {
        this._logToProject(
          projectId,
          `[Оркестратор]: Превышен лимит итераций.`,
          agentId,
          agentName,
        );
      }

      await this.updateTaskStatus(
        taskId,
        projectId,
        TaskStatus.COMPLETED,
        agentId,
        agentName,
      );
    } catch (error) {
      this.logger.error(`КРИТИЧЕСКАЯ ОШИБКА в задаче ${taskId}:`, error);
      let userFriendlyMessage = `[Оркестратор]: КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`;
      if (error instanceof DockerConnectionError) {
        userFriendlyMessage = `[Оркестратор]: ОШИБКА: Не удалось подключиться к Docker.`;
      } else if (error instanceof ImagePullError) {
        userFriendlyMessage = `[Оркестратор]: ОШИБКА: Не удалось загрузить Docker-образ.`;
      }
      this._logToProject(projectId, userFriendlyMessage, agentId, agentName);
      await this.updateTaskStatus(
        taskId,
        projectId,
        TaskStatus.FAILED,
        agentId,
        agentName,
      );
    } finally {
      if (containerId) {
        this._logToProject(
          projectId,
          `[Docker]: Уничтожаю среду...`,
          agentId,
          agentName,
        );
        await this.dockerManager.stopAndRemoveContainer(containerId);
        this._logToProject(
          projectId,
          `[Docker]: Среда уничтожена.`,
          agentId,
          agentName,
        );
      }
    }
  }

  private async buildIterativePromptWithMemory(
    agent: Agent,
    task: Task,
    memoryContext: string,
  ): Promise<string> {
    const availableTools = this.toolService.getAvailableTools();
    const toolsDescription = availableTools.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');
    
    // Inject relevant knowledge
    const taskContext = `${task.title}: ${task.description}`;
    const relevantKnowledge = await this.knowledgeService.injectRelevantKnowledge(
      agent.id,
      taskContext,
    );
    
    return `
    SYSTEM PROMPT: Ты - автономный AI-агент-разработчик.
    ТВОЯ РОЛЬ: ${agent.role}.
    ПРАВИЛА:
    1. Твоя рабочая директория ВСЕГДА /app, которая является Git-репозиторием.
    2. Тебе доступны сложные shell-команды, например 'cd subdirectory && ls'.
    3. Все необходимые инструменты (git, python, node, npm, nano, vim, tree) УЖЕ УСТАНОВЛЕНЫ.
    4. У тебя есть доступ к следующим ИНСТРУМЕНТАМ:
${toolsDescription}
    Чтобы использовать инструмент, добавь в свою мысль: use_tool("имя_инструмента", {"параметр": "значение"})
    5. Твой ответ ВСЕГДА должен быть ТОЛЬКО JSON-объектом.
    6. Финальным шагом твоей работы **обязательно** должен быть git push.
    7. Когда задача полностью выполнена (включая git push), "finished" должно быть true.

    СТРОГИЙ ФОРМАТ ОТВЕТА:
    {"thought": "Моя мысль.", "command": "команда", "args": ["аргумент"], "finished": false}
    
    ГЛОБАЛЬНАЯ ЗАДАЧА: "${task.title}: ${task.description}"
    ${relevantKnowledge}
    КОНТЕКСТ И ИСТОРИЯ:
    ${memoryContext}

    ТВОЙ СЛЕДУЮЩИЙ ШАГ В ФОРМАТЕ JSON:`;
  }

  private estimateTokenCount(text: string): number {
    // Простая оценка: ~4 символа = 1 токен
    return Math.ceil(text.length / 4);
  }

  private async executeAndLogCommand(
    containerId: string,
    projectId: string,
    command: string[],
    agentId: string,
    agentName: string,
    workingDir: string | null = null,
  ): Promise<string> {
    this._logToProject(
      projectId,
      `[Команда]: ${command.join(' ')}`,
      agentId,
      agentName,
    );
    const result = await this.dockerManager.executeCommand(
      containerId,
      command,
      workingDir,
    );
    this._logToProject(
      projectId,
      `[Результат]:\n${result}`,
      agentId,
      agentName,
    );
    return result;
  }

  private _logToProject(
    projectId: string,
    message: string,
    agentId: string,
    agentName: string,
  ) {
    this.eventsGateway.sendToProjectRoom(projectId, 'agentLog', {
      message,
      agentId,
      agentName,
      timestamp: new Date(),
    });
  }

  private async updateTaskStatus(
    taskId: string,
    projectId: string,
    newStatus: TaskStatus,
    agentId: string,
    agentName: string,
  ) {
    await this.tasksRepository.update(taskId, { status: newStatus });
    this.eventsGateway.sendToProjectRoom(projectId, 'taskStatusUpdate', {
      taskId,
      newStatus,
      agentId,
      agentName,
    });
    this._logToProject(
      projectId,
      `[Статус]: Статус задачи изменен на ${newStatus}`,
      agentId,
      agentName,
    );
  }
}
