import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Project } from '../../projects/schemas/project.schema';
import { Agent } from '../../agents/schemas/agent.schema';

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export type TaskDocument = HydratedDocument<Task>;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  // Связь с проектом (обязательная)
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  project: Project;


  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Agent', required: false })
  assignee?: Agent; // <--- ПЕРЕИМЕНОВАНО с 'agent' на 'assignee'
}

export const TaskSchema = SchemaFactory.createForClass(Task);
