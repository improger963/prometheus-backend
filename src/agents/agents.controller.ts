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
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UserDocument } from '../auth/schemas/user.schema';

@UseGuards(AuthGuard('jwt'))
@Controller('projects/:projectId/agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Body() createAgentDto: CreateAgentDto,
    @Req() req: { user: UserDocument },
  ) {
    return this.agentsService.create(projectId, createAgentDto, req.user);
  }

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @Req() req: { user: UserDocument },
  ) {
    return this.agentsService.findAll(projectId, req.user);
  }

  @Get(':agentId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('agentId') agentId: string,
    @Req() req: { user: UserDocument },
  ) {
    return this.agentsService.findOne(projectId, agentId, req.user);
  }

  @Patch(':agentId')
  update(
    @Param('projectId') projectId: string,
    @Param('agentId') agentId: string,
    @Body() updateAgentDto: Partial<CreateAgentDto>,
    @Req() req: { user: UserDocument },
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
    @Param('projectId') projectId: string,
    @Param('agentId') agentId: string,
    @Req() req: { user: UserDocument },
  ) {
    return this.agentsService.remove(projectId, agentId, req.user);
  }
}
