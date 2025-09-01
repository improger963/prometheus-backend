import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { CreateAgentDto } from './create-agent.dto';

export class UpdateAgentDto extends PartialType(CreateAgentDto) {
  @IsOptional()
  @IsNumber({}, { message: 'Rating must be a number' })
  @Min(0, { message: 'Rating must be at least 0' })
  @Max(5, { message: 'Rating must not exceed 5' })
  rating?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Experience must be a number' })
  @Min(0, { message: 'Experience must be at least 0' })
  experience?: number;
}