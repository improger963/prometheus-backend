import { Agent } from 'src/agents/entities/agent.entity';
import { User } from 'src/auth/entities/user.entity';
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

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  gitRepositoryURL: string;


  @OneToMany(() => Agent, (agent) => agent.project)
  agents: Agent[];

  @OneToMany(() => Task, (task) => task.project)
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ default: 'ubuntu:latest' }) // По умолчанию - базовая ubuntu
  baseDockerImage: string;
  // -------------------

  @ManyToOne(() => User, (user) => user.projects, { onDelete: 'CASCADE' })
  user: User;
}
