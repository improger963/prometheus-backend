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

@Entity('knowledge_records')
@Index(['userId', 'tags'])
export class KnowledgeRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column('simple-array', { default: '' })
  tags: string[];

  @Column({ default: 'public' })
  visibility: 'public' | 'private' | 'team';

  @Column({ default: 'general' })
  category:
    | 'general'
    | 'technical'
    | 'best-practice'
    | 'troubleshooting'
    | 'tutorial';

  @Column('int', { default: 0 })
  useCount: number;

  @Column('decimal', { precision: 3, scale: 2, default: 0.0 })
  rating: number;

  @Column('int', { default: 0 })
  ratingCount: number;

  @ManyToOne(() => User, (user) => user.knowledgeRecords, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
