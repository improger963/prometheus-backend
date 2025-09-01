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
  Query,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { KnowledgeService } from './knowledge.service';
import { CreateKnowledgeDto } from './dto/create-knowledge.dto';
import { User } from '../auth/entities/user.entity';

@UseGuards(AuthGuard('jwt'))
@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  @Post()
  create(
    @Body() createKnowledgeDto: CreateKnowledgeDto,
    @Req() req: { user: User },
  ) {
    return this.knowledgeService.createKnowledgeRecord(
      req.user.id,
      createKnowledgeDto,
    );
  }

  @Get()
  findAll(
    @Req() req: { user: User },
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    const parsedPage = page ? parseInt(page, 10) : 1;
    const parsedLimit = limit ? parseInt(limit, 10) : 10;

    // Handle NaN cases by using defaults
    const finalPage = isNaN(parsedPage) ? 1 : parsedPage;
    const finalLimit = isNaN(parsedLimit) ? 10 : parsedLimit;

    if (finalPage < 1 || finalLimit < 1 || finalLimit > 100) {
      throw new BadRequestException('Invalid pagination parameters');
    }

    return this.knowledgeService.findAll(
      req.user.id,
      finalPage,
      finalLimit,
      category,
      search,
    );
  }

  @Get('popular')
  getPopular(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 10;
    return this.knowledgeService.getPopularKnowledge(parsedLimit);
  }

  @Get('my')
  getUserKnowledge(@Req() req: { user: User }) {
    return this.knowledgeService.getUserKnowledge(req.user.id);
  }

  @Get('search')
  searchByTags(
    @Query('tags') tags: string,
    @Req() req: { user: User },
  ) {
    if (!tags) {
      throw new BadRequestException('Tags parameter is required');
    }

    const tagArray = tags.split(',').map(tag => tag.trim());
    return this.knowledgeService.searchKnowledgeByTags(tagArray, req.user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: User },
  ) {
    return this.knowledgeService.findOne(id, req.user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateKnowledgeDto: Partial<CreateKnowledgeDto>,
    @Req() req: { user: User },
  ) {
    return this.knowledgeService.update(id, req.user.id, updateKnowledgeDto);
  }

  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: { user: User },
  ) {
    return this.knowledgeService.remove(id, req.user.id);
  }

  @Post(':id/rate')
  rateKnowledge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() rateDto: { rating: number },
    @Req() req: { user: User },
  ) {
    if (rateDto.rating < 1 || rateDto.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    return this.knowledgeService.rateKnowledge(id, req.user.id, rateDto.rating);
  }
}