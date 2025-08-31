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
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { User } from '../auth/entities/user.entity'; // <-- Обновляем тип

@UseGuards(AuthGuard('jwt'))
@Controller('projects/:projectId/agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  create(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() createAgentDto: CreateAgentDto,
    @Req() req: { user: User },
  ) {
    return this.agentsService.create(projectId, createAgentDto, req.user);
  }

  @Get()
  findAll(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() req: { user: User },
  ) {
    return this.agentsService.findAll(projectId, req.user);
  }

  @Get(':agentId')
  findOne(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Req() req: { user: User },
  ) {
    return this.agentsService.findOne(projectId, agentId, req.user);
  }

  @Patch(':agentId')
  update(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() updateAgentDto: Partial<CreateAgentDto>,
    @Req() req: { user: User },
  ) {
    return this.agentsService.update(
      projectId,
      agentId,
      updateAgentDto,
      req.user,
    );
  }

  @Delete(':agentId')
  remove(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Req() req: { user: User },
  ) {
    return this.agentsService.remove(projectId, agentId, req.user);
  }
}
