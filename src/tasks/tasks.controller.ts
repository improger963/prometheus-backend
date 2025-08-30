import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UserDocument } from '../auth/schemas/user.schema';

@UseGuards(AuthGuard('jwt'))
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto, // DTO уже обновлен
    @Req() req: { user: UserDocument },
  ) {
    return this.tasksService.create(projectId, createTaskDto, req.user);
  }

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @Req() req: { user: UserDocument },
  ) {
    return this.tasksService.findAll(projectId, req.user);
  }

  @Get(':taskId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Req() req: { user: UserDocument },
  ) {
    return this.tasksService.findOne(projectId, taskId, req.user);
  }

  @Patch(':taskId')
  update(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() updateTaskDto: Partial<CreateTaskDto>,
    @Req() req: { user: UserDocument },
  ) {
    return this.tasksService.update(projectId, taskId, updateTaskDto, req.user);
  }

  @Delete(':taskId')
  remove(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Req() req: { user: UserDocument },
  ) {
    return this.tasksService.remove(projectId, taskId, req.user);
  }
}
