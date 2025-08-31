import { Project } from 'src/projects/entities/project.entity';
import { Task } from 'src/tasks/entities/task.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';

@Entity('agents')
export class Agent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  role: string;

  @Column('jsonb')
  personalityMatrix: Record<string, any>;

  @Column('jsonb')
  llmConfig: {
    provider: 'google' | 'openai' | 'groq' | 'mistral';
    model: string;
  };

  @ManyToOne(() => Project, (project) => project.agents, {
    onDelete: 'CASCADE',
  })
  project: Project;

  @OneToMany(() => Task, (task) => task.assignee)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
