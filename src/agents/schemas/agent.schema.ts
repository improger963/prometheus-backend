import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';
import { Project } from '../../projects/schemas/project.schema';

export type AgentDocument = HydratedDocument<Agent>;

@Schema({ timestamps: true })
export class Agent {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  role: string;

  @Prop({ type: Object, required: true })
  personalityMatrix: Record<string, any>;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Project', required: true })
  project: Project;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);
