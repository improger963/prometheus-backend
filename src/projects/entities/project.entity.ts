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
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('projects')
@Index(['userId'])
@Index(['name', 'userId'])
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column('text', { nullable: true })
  description?: string;

  @Column({ length: 500, nullable: true })
  gitRepositoryURL?: string;

  @Column({ length: 500, nullable: true })
  gitAccessToken?: string;

  @Column({ default: 'ubuntu:latest', length: 100 })
  baseDockerImage: string;

  // Array of agent IDs for team management
  @Column('simple-array', { default: '' })
  agentIds: string[];

  // User ownership with explicit foreign key
  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, (user) => user.projects, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany(() => Task, (task) => task.project, { cascade: true })
  tasks: Task[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
