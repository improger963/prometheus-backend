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
  Version,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiInternalServerErrorResponse
} from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { User } from '../auth/entities/user.entity';

@ApiTags('Projects')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Create a new project',
    description: 'Creates a new project for the authenticated user' 
  })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({ 
    status: 201, 
    description: 'Project successfully created',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        description: { type: 'string' },
        gitRepositoryURL: { type: 'string', format: 'uri' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' }
          }
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Validation errors' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  create(
    @Body() createProjectDto: CreateProjectDto,
    @Req() req: { user: User },
  ) {
    return this.projectsService.create(createProjectDto, req.user);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Get all user projects',
    description: 'Retrieves all projects belonging to the authenticated user' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Projects successfully retrieved',
    schema: {
      type: 'object',
      properties: {
        projects: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string' },
              gitRepositoryURL: { type: 'string', format: 'uri' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  findAll(@Req() req: { user: User }) {
    return this.projectsService.findAll(req.user);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Get project by ID',
    description: 'Retrieves a specific project by its ID if it belongs to the authenticated user' 
  })
  @ApiParam({ name: 'id', description: 'Project UUID', format: 'uuid' })
  @ApiResponse({ 
    status: 200, 
    description: 'Project successfully retrieved',
    schema: {
      type: 'object',
      properties: {
        project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            gitRepositoryURL: { type: 'string', format: 'uri' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiNotFoundResponse({ description: 'Project not found or access denied' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user: User }) {
    return this.projectsService.findOne(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ 
    summary: 'Update project',
    description: 'Updates a project\'s information if it belongs to the authenticated user' 
  })
  @ApiParam({ name: 'id', description: 'Project UUID', format: 'uuid' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', minLength: 3, maxLength: 255 },
        description: { type: 'string', maxLength: 1000 },
        gitRepositoryURL: { type: 'string', format: 'uri' }
      }
    }
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Project successfully updated',
    schema: {
      type: 'object',
      properties: {
        project: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            gitRepositoryURL: { type: 'string', format: 'uri' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Validation errors or invalid UUID format' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiNotFoundResponse({ description: 'Project not found or access denied' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProjectDto: Partial<CreateProjectDto>,
    @Req() req: { user: User },
  ) {
    return this.projectsService.update(id, updateProjectDto, req.user);
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Delete project',
    description: 'Deletes a project if it belongs to the authenticated user' 
  })
  @ApiParam({ name: 'id', description: 'Project UUID', format: 'uuid' })
  @ApiResponse({ 
    status: 200, 
    description: 'Project successfully deleted',
    schema: {
      type: 'object',
      properties: {
        deleted: { type: 'boolean', example: true },
        id: { type: 'string', format: 'uuid' }
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Invalid UUID format' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiNotFoundResponse({ description: 'Project not found or access denied' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: { user: User }) {
    return this.projectsService.remove(id, req.user);
  }
}
