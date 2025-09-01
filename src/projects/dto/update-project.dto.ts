import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectDto } from './create-project.dto';
import { IsOptional, IsArray, IsUUID, ArrayMaxSize } from 'class-validator';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @IsOptional()
  @IsArray({ message: 'Agent IDs must be an array' })
  @IsUUID('4', { each: true, message: 'Each agent ID must be a valid UUID' })
  @ArrayMaxSize(50, { message: 'Cannot assign more than 50 agents to a project' })
  agentIds?: string[];
}