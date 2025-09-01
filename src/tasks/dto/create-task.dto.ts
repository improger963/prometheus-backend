import { 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  IsUUID, 
  IsArray, 
  ArrayMaxSize,
  IsEnum,
  IsDateString,
  MaxLength,
  MinLength,
  IsObject,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { TaskPriority } from '../entities/task.entity';

export class CreateTaskDto {
  @IsString({ message: 'Title must be a string' })
  @IsNotEmpty({ message: 'Title cannot be empty' })
  @MinLength(3, { message: 'Title must be at least 3 characters long' })
  @MaxLength(255, { message: 'Title must not exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  title: string;

  @IsString({ message: 'Description must be a string' })
  @IsNotEmpty({ message: 'Description cannot be empty' })
  @MinLength(10, { message: 'Description must be at least 10 characters long' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  @Transform(({ value }) => value?.trim())
  description: string;

  @IsOptional()
  @IsArray({ message: 'Assignee IDs must be an array' })
  @IsUUID('4', { each: true, message: 'Each assignee ID must be a valid UUID' })
  @ArrayMaxSize(10, { message: 'Cannot assign more than 10 agents to a task' })
  assigneeIds?: string[];

  @IsOptional()
  @IsUUID('4', { message: 'Agent ID must be a valid UUID' })
  agentId?: string;

  @IsOptional()
  @IsEnum(TaskPriority, {
    message: `Priority must be one of: ${Object.values(TaskPriority).join(', ')}`,
  })
  priority?: keyof typeof TaskPriority;

  @IsOptional()
  @IsDateString({}, { message: 'Due date must be a valid ISO date string' })
  dueDate?: string;

  @IsOptional()
  @IsObject({ message: 'Parameters must be an object' })
  parameters?: Record<string, any>;
}
