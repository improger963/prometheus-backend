import { Agent } from 'src/agents/entities/agent.entity';
import { Project } from 'src/projects/entities/project.entity';
import { KnowledgeRecord } from 'src/knowledge/entities/knowledge-record.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';

@Entity('users')
@Index(['email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Column({ length: 255 })
  password: string;

  @OneToMany(() => Agent, (agent) => agent.user, { cascade: true })
  agents: Agent[];

  @OneToMany(() => Project, (project) => project.user, { cascade: true })
  projects: Project[];

  @OneToMany(() => KnowledgeRecord, (knowledgeRecord) => knowledgeRecord.user, { cascade: true })
  knowledgeRecords: KnowledgeRecord[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
