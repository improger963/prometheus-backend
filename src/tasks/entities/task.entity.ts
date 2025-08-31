import { Agent } from 'src/agents/entities/agent.entity';
import { Project } from 'src/projects/entities/project.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';

// --- ИЗМЕНЕНИЕ: Заменяем enum на объект и union type ---
export const TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];
// --------------------------------------------------------

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'varchar', // PostgreSQL будет хранить это как обычную строку
    default: TaskStatus.PENDING,
  })
  status: TaskStatus;

  @ManyToOne(() => Project, (project) => project.tasks, { onDelete: 'CASCADE' })
  project: Project;

  @ManyToOne(() => Agent, (agent) => agent.tasks, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  assignee?: Agent;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
