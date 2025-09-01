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
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AgentsService } from './agents.service';
import { ReputationService } from './services/reputation.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { User } from '../auth/entities/user.entity';

// NEW: Global Agents API
@UseGuards(AuthGuard('jwt'))
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly reputationService: ReputationService,
  ) {}

  @Post()
  create(
    @Body() createAgentDto: CreateAgentDto,
    @Req() req: { user: User },
  ) {
    return this.agentsService.createGlobalAgent(req.user.id, createAgentDto);
  }

  @Get()
  findAll(@Req() req: { user: User }) {
    return this.agentsService.getUserAgents(req.user.id);
  }

  @Get(':agentId')
  findOne(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Req() req: { user: User },
  ) {
    return this.agentsService.getAgentById(agentId, req.user.id);
  }

  @Patch(':agentId')
  update(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() updateAgentDto: Partial<CreateAgentDto>,
    @Req() req: { user: User },
  ) {
    return this.agentsService.updateAgent(
      agentId,
      req.user.id,
      updateAgentDto,
    );
  }

  @Delete(':agentId')
  remove(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Req() req: { user: User },
  ) {
    return this.agentsService.deleteAgent(agentId, req.user.id);
  }

  @Post(':agentId/rate')
  async rateAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() rateDto: { rating: number; feedback?: string },
    @Req() req: { user: User },
  ) {
    // Validate rating range
    if (rateDto.rating < 1 || rateDto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }
    
    // Verify agent ownership
    await this.agentsService.getAgentById(agentId, req.user.id);
    
    await this.reputationService.updateAgentRating(
      agentId, 
      rateDto.rating, 
      rateDto.feedback
    );
    
    return { success: true, message: 'Agent rated successfully' };
  }

  @Get(':agentId/stats')
  async getAgentStats(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Req() req: { user: User },
  ) {
    // Verify agent ownership
    await this.agentsService.getAgentById(agentId, req.user.id);
    return this.reputationService.getAgentStats(agentId);
  }

  @Post(':agentId/promote')
  async promoteAgent(
    @Param('agentId', ParseUUIDPipe) agentId: string,
    @Body() promoteDto: { bonusXP: number; reason: string },
    @Req() req: { user: User },
  ) {
    // Verify agent ownership
    await this.agentsService.getAgentById(agentId, req.user.id);
    
    await this.reputationService.promoteAgent(
      agentId,
      promoteDto.bonusXP,
      promoteDto.reason,
    );
    
    return { success: true, message: 'Agent promoted successfully' };
  }

  @Get('leaderboard')
  async getLeaderboard(
    @Query('limit') limit?: string,
    @Query('timeframe') timeframe?: 'day' | 'week' | 'month',
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    
    if (timeframe) {
      return this.reputationService.getTopPerformers(timeframe, parsedLimit);
    }
    
    return this.reputationService.getAgentLeaderboard(parsedLimit);
  }
}
