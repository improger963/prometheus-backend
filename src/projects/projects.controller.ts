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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UserDocument } from '../auth/schemas/user.schema';

// @UseGuards защищает ВСЕ эндпоинты в этом контроллере.
// Доступ к ним будет возможен только при наличии валидного JWT токена.
@UseGuards(AuthGuard('jwt'))
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(
    @Body() createProjectDto: CreateProjectDto,
    @Req() req: { user: UserDocument },
  ) {
    // Наша JwtStrategy прикрепляет объект пользователя к запросу (req.user)
    return this.projectsService.create(createProjectDto, req.user);
  }

  @Get()
  findAll(@Req() req: { user: UserDocument }) {
    return this.projectsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: { user: UserDocument }) {
    return this.projectsService.findOne(id, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: Partial<CreateProjectDto>,
    @Req() req: { user: UserDocument },
  ) {
    return this.projectsService.update(id, updateProjectDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: { user: UserDocument }) {
    return this.projectsService.remove(id, req.user);
  }
}
