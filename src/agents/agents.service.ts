import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Agent, AgentDocument } from './schemas/agent.schema';
import { UserDocument } from '../auth/schemas/user.schema';
import { CreateAgentDto } from './dto/create-agent.dto';
import { Project, ProjectDocument } from '../projects/schemas/project.schema';

@Injectable()
export class AgentsService {
  constructor(
    @InjectModel(Agent.name) private agentModel: Model<AgentDocument>,
    // Нам нужна модель Project, чтобы проверять права доступа
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
  ) {}

  // Вспомогательная функция для проверки владения проектом
  private async _verifyProjectOwnership(
    projectId: string,
    user: UserDocument,
  ): Promise<void> {
    const project = await this.projectModel.findOne({
      _id: projectId,
      user: user._id,
    });
    if (!project) {
      // Бросаем ошибку, если проект не найден или не принадлежит пользователю
      throw new NotFoundException(
        `Проект с ID "${projectId}" не найден или у вас нет к нему доступа.`,
      );
    }
  }

  async create(
    projectId: string,
    createAgentDto: CreateAgentDto,
    user: UserDocument,
  ): Promise<Agent> {
    await this._verifyProjectOwnership(projectId, user);
    const newAgent = new this.agentModel({
      ...createAgentDto,
      project: projectId, // Привязываем агента к проекту
    });
    return newAgent.save();
  }

  async findAll(projectId: string, user: UserDocument): Promise<Agent[]> {
    await this._verifyProjectOwnership(projectId, user);
    return this.agentModel.find({ project: projectId }).exec();
  }

  async findOne(
    projectId: string,
    agentId: string,
    user: UserDocument,
  ): Promise<Agent> {
    await this._verifyProjectOwnership(projectId, user);
    const agent = await this.agentModel.findOne({
      _id: agentId,
      project: projectId,
    });
    if (!agent) {
      throw new NotFoundException(
        `Агент с ID "${agentId}" в проекте "${projectId}" не найден.`,
      );
    }
    return agent;
  }

  async update(
    projectId: string,
    agentId: string,
    updateAgentDto: Partial<CreateAgentDto>,
    user: UserDocument,
  ): Promise<Agent> {
    await this._verifyProjectOwnership(projectId, user);
    const agent = await this.agentModel.findOneAndUpdate(
      { _id: agentId, project: projectId },
      updateAgentDto,
      { new: true },
    );
    if (!agent) {
      throw new NotFoundException(
        `Агент с ID "${agentId}" в проекте "${projectId}" не найден.`,
      );
    }
    return agent;
  }

  async remove(
    projectId: string,
    agentId: string,
    user: UserDocument,
  ): Promise<{ deleted: boolean; id: string }> {
    await this._verifyProjectOwnership(projectId, user);
    const result = await this.agentModel.deleteOne({
      _id: agentId,
      project: projectId,
    });
    if (result.deletedCount === 0) {
      throw new NotFoundException(
        `Агент с ID "${agentId}" в проекте "${projectId}" не найден.`,
      );
    }
    return { deleted: true, id: agentId };
  }
}
