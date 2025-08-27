import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project, ProjectDocument } from './schemas/project.schema';
import { UserDocument } from '../auth/schemas/user.schema';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  // Найти все проекты, принадлежащие конкретному пользователю
  async findAll(user: UserDocument): Promise<Project[]> {
    return this.projectModel.find({ user: user._id }).exec();
  }

  // Найти один проект по ID, убедившись, что он принадлежит пользователю
  async findOne(id: string, user: UserDocument): Promise<Project> {
    const project = await this.projectModel.findOne({
      _id: id,
      user: user._id,
    });
    if (!project) {
      throw new NotFoundException(`Проект с ID "${id}" не найден.`);
    }
    return project;
  }

  // Создать новый проект для текущего пользователя
  async create(
    createProjectDto: CreateProjectDto,
    user: UserDocument,
  ): Promise<Project> {
    const newProject = new this.projectModel({
      ...createProjectDto,
      user: user._id, // Привязываем проект к ID текущего пользователя
    });
    return newProject.save();
  }

  // Обновить проект, убедившись, что он принадлежит пользователю
  async update(
    id: string,
    updateProjectDto: Partial<CreateProjectDto>,
    user: UserDocument,
  ): Promise<Project> {
    const project = await this.projectModel.findOneAndUpdate(
      { _id: id, user: user._id }, // Условие поиска
      updateProjectDto, // Данные для обновления
      { new: true }, // Вернуть обновленный документ
    );

    if (!project) {
      throw new NotFoundException(`Проект с ID "${id}" не найден.`);
    }
    return project;
  }

  // Удалить проект, убедившись, что он принадлежит пользователю
  async remove(
    id: string,
    user: UserDocument,
  ): Promise<{ deleted: boolean; id: string }> {
    const result = await this.projectModel.deleteOne({
      _id: id,
      user: user._id,
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Проект с ID "${id}" не найден.`);
    }
    return { deleted: true, id };
  }
}
