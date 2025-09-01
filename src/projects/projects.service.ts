import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from './entities/project.entity';
import { User } from '../auth/entities/user.entity';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  // Find all projects belonging to a specific user
  async findAll(user: User): Promise<Project[]> {
    return this.projectsRepository.find({
      where: { user: { id: user.id } }, // <-- Search by related entity ID
    });
  }

  // Find one project by ID, ensuring it belongs to the user
  async findOne(id: string, user: User): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id, user: { id: user.id } },
    });
    if (!project) {
      throw new NotFoundException(`Project with ID "${id}" not found.`);
    }
    return project;
  }

  // Create a new project for the current user
  async create(
    createProjectDto: CreateProjectDto,
    user: User,
  ): Promise<Project> {
    const newProject = this.projectsRepository.create({
      ...createProjectDto,
      user: user, // <-- TypeORM is smart enough to save only the ID
    });
    return this.projectsRepository.save(newProject);
  }

  // Update a project, ensuring it belongs to the user
  async update(
    id: string,
    updateProjectDto: Partial<CreateProjectDto>,
    user: User,
  ): Promise<Project> {
    // First need to find the project to ensure access rights
    const project = await this.findOne(id, user);

    // Update the found object and save
    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  // Delete a project, ensuring it belongs to the user
  async remove(
    id: string,
    user: User,
  ): Promise<{ deleted: boolean; id: string }> {
    const project = await this.findOne(id, user); // Check access rights
    await this.projectsRepository.remove(project);
    return { deleted: true, id };
  }
}
