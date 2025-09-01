import {
  Controller,
  Post,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpStatus,
  ConflictException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { OrchestrationService } from './orchestration.service';
import { TasksService } from '../tasks/tasks.service';
import { User } from '../auth/entities/user.entity';
import { Logger } from '@nestjs/common';

@UseGuards(AuthGuard('jwt'))
@Controller('orchestrator')
export class OrchestratorController {
  private readonly logger = new Logger(OrchestratorController.name);

  constructor(
    private readonly orchestrationService: OrchestrationService,
    private readonly tasksService: TasksService,
  ) {}

  @Post('tasks/:taskId/run')
  async runTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Req() req: { user: User },
  ) {
    try {
      this.logger.log(`Received task execution request for task ${taskId} from user ${req.user.id}`);

      // First, verify that the task exists and belongs to user's project
      const task = await this.tasksService.findTaskById(taskId, req.user);
      
      if (!task) {
        throw new NotFoundException('Task not found or does not belong to user');
      }

      // Check if task is already running or completed
      if (task.status === 'IN_PROGRESS') {
        throw new ConflictException('Task is already running');
      }

      if (task.status === 'COMPLETED') {
        throw new BadRequestException('Task is already completed');
      }

      // Validate that task has assignees
      if (!task.assigneeIds || task.assigneeIds.length === 0) {
        throw new BadRequestException('Task cannot be executed: no assignees specified');
      }

      // Generate execution ID
      const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      this.logger.log(`Initiating task execution ${taskId} with execution ID ${executionId}`);

      // Start task execution asynchronously (fire and forget)
      this.orchestrationService.startTaskExecution(taskId).catch((error) => {
        this.logger.error(`Error executing task ${taskId}:`, error);
      });

      // Return immediate response
      return {
        message: 'Task execution command accepted. Monitor real-time updates for progress.',
        taskId,
        executionId,
        status: 'initiated',
      };

    } catch (error) {
      this.logger.error(`Error starting task ${taskId}:`, error);

      if (error instanceof NotFoundException || 
          error instanceof ConflictException || 
          error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Internal orchestration system error');
    }
  }
}