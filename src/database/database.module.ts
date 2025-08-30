import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Agent, AgentSchema } from 'src/agents/schemas/agent.schema';
import { User, UserSchema } from 'src/auth/schemas/user.schema';
import { Project, ProjectSchema } from 'src/projects/schemas/project.schema';
import { Task, TaskSchema } from 'src/tasks/schemas/task.schema';

const MODELS = [
  { name: User.name, schema: UserSchema },
  { name: Project.name, schema: ProjectSchema },
  { name: Agent.name, schema: AgentSchema },
  { name: Task.name, schema: TaskSchema },
];

@Global() // <-- Делаем модуль глобальным
@Module({
  imports: [MongooseModule.forFeature(MODELS)],
  exports: [MongooseModule], // <-- Экспортируем, чтобы @InjectModel работало везде
})
export class DatabaseModule {}
