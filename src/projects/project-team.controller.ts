import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ProjectTeamService } from './project-team.service';
import { User } from '../auth/entities/user.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('projects/:projectId/team')
export class ProjectTeamController {
  constructor(private readonly projectTeamService: ProjectTeamService) {}

  @Get()
  getProjectTeam(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Req() req: { user: User },
  ) {
    return this.projectTeamService.getProjectTeam(projectId, req.user.id);
  }

  @Post('invite')
  inviteAgent(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() inviteDto: { agentId: string },
    @Req() req: { user: User },
  ) {
    return this.projectTeamService.inviteAgentToProject(
      projectId,
      inviteDto.agentId,
      req.user.id,
    );
  }

  @Delete(':agentId')
  removeAgent(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Req() req: { user: User },
  ) {
    return this.projectTeamService.removeAgentFromProject(
      projectId,
      agentId,
      req.user.id,
    );
  }
}