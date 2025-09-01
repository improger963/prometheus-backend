import { User } from 'src/auth/entities/user.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';

export interface LLMConfig {
  provider: 'google' | 'openai' | 'groq' | 'mistral';
  model: string;
  temperature?: number;
  maxTokens?: number;
}

@Entity('agents')
@Index(['userId'])
@Index(['name', 'userId'])
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 500 })
  role: string;

  @Column('jsonb')
  personalityMatrix: Record<string, any>;

  @Column('jsonb')
  llmConfig: LLMConfig;

  // Gamification fields
  @Column('decimal', { precision: 3, scale: 2, default: 0.0 })
  rating: number;

  @Column('int', { default: 0 })
  experience: number;

  // User ownership with explicit foreign key
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.agents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
