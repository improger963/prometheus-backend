import { Agent } from 'src/agents/entities/agent.entity';
import { Task } from 'src/tasks/entities/task.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';

export interface MemoryStep {
  timestamp: Date;
  action: string;
  result: string;
  tokenCount?: number;
}

export interface CompressedMemory {
  globalGoal: string;
  firstSteps: MemoryStep[];
  lastSteps: MemoryStep[];
  compressionRatio: number;
  totalOriginalSteps: number;
}

@Entity('agent_memories')
@Index(['agentId', 'taskId'])
export class AgentMemory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  agentId: string;

  @Column('uuid')
  taskId: string;

  @Column('jsonb')
  contextHistory: MemoryStep[];

  @Column('text')
  globalGoal: string;

  @Column('jsonb', { nullable: true })
  firstSteps?: MemoryStep[];

  @Column('jsonb', { nullable: true })
  lastSteps?: MemoryStep[];

  @Column('int', { default: 0 })
  totalTokenCount: number;

  @Column('boolean', { default: false })
  isCompressed: boolean;

  @Column('decimal', { precision: 5, scale: 2, default: 0.0 })
  compressionRatio: number;

  @ManyToOne(() => Agent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentId' })
  agent: Agent;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'taskId' })
  task: Task;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}