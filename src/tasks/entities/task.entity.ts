import { Project } from 'src/projects/entities/project.entity';
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

// Task status constants
export const TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

// Task priority constants
export const TaskPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'critical',
} as const;

export type TaskPriority = (typeof TaskPriority)[keyof typeof TaskPriority];

@Entity('tasks')
@Index(['projectId'])
@Index(['status', 'projectId'])
@Index(['priority', 'projectId'])
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @Column({ 
    type: 'varchar',
    length: 20,
    default: TaskPriority.MEDIUM 
  })
  priority: TaskPriority;

  // Multiple assignees support
  @Column('simple-array', { default: '' })
  assigneeIds: string[];

  @Column('jsonb', { nullable: true })
  parameters?: Record<string, any>;

  @Column('timestamp', { nullable: true })
  dueDate?: Date;

  // Project relationship with explicit foreign key
  @Column('uuid')
  projectId: string;

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
