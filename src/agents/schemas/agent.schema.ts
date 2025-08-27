import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AgentDocument = HydratedDocument<Agent>;

@Schema({ timestamps: true })
export class Agent {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  role: string;

  @Prop({ type: Object, required: true })
  personalityMatrix: Record<string, any>;
}

export const AgentSchema = SchemaFactory.createForClass(Agent);
