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
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { User } from '../auth/entities/user.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @Req() req: { user: User },
  ) {
    return this.tasksService.create(projectId, createTaskDto, req.user);
  }

  @Get()
  findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() req: { user: User },
  ) {
    return this.tasksService.findAll(projectId, req.user);
  }

  @Get(':taskId')
  findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Req() req: { user: User },
  ) {
    return this.tasksService.findOne(projectId, taskId, req.user);
  }

  @Patch(':taskId')
  update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() updateTaskDto: Partial<CreateTaskDto>,
    @Req() req: { user: User },
  ) {
    return this.tasksService.update(projectId, taskId, updateTaskDto, req.user);
  }

  @Delete(':taskId')
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Req() req: { user: User },
  ) {
    return this.tasksService.remove(projectId, taskId, req.user);
  }
}
