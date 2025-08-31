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

  // Найти все проекты, принадлежащие конкретному пользователю
  async findAll(user: User): Promise<Project[]> {
    return this.projectsRepository.find({
      where: { user: { id: user.id } }, // <-- Поиск по ID связанной сущности
    });
  }

  // Найти один проект по ID, убедившись, что он принадлежит пользователю
  async findOne(id: string, user: User): Promise<Project> {
    const project = await this.projectsRepository.findOne({
      where: { id, user: { id: user.id } },
    });
    if (!project) {
      throw new NotFoundException(`Проект с ID "${id}" не найден.`);
    }
    return project;
  }

  // Создать новый проект для текущего пользователя
  async create(
    createProjectDto: CreateProjectDto,
    user: User,
  ): Promise<Project> {
    const newProject = this.projectsRepository.create({
      ...createProjectDto,
      user: user, // <-- TypeORM достаточно умен, чтобы сохранить только ID
    });
    return this.projectsRepository.save(newProject);
  }

  // Обновить проект, убедившись, что он принадлежит пользователю
  async update(
    id: string,
    updateProjectDto: Partial<CreateProjectDto>,
    user: User,
  ): Promise<Project> {
    // Сначала нужно найти проект, чтобы убедиться в правах доступа
    const project = await this.findOne(id, user);

    // Обновляем найденный объект и сохраняем
    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  // Удалить проект, убедившись, что он принадлежит пользователю
  async remove(
    id: string,
    user: User,
  ): Promise<{ deleted: boolean; id: string }> {
    const project = await this.findOne(id, user); // Проверка прав доступа
    await this.projectsRepository.remove(project);
    return { deleted: true, id };
  }
}
