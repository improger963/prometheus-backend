import { Type, Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsPositive,
} from 'class-validator';

class LlmConfigDto {
  @IsEnum(['google', 'openai', 'groq', 'mistral'], {
    message: 'Provider must be one of: google, openai, groq, mistral',
  })
  @IsNotEmpty({ message: 'Provider cannot be empty' })
  provider: 'google' | 'openai' | 'groq' | 'mistral';

  @IsString({ message: 'Model must be a string' })
  @IsNotEmpty({ message: 'Model cannot be empty' })
  @MaxLength(100, { message: 'Model name must not exceed 100 characters' })
  model: string;

  @IsOptional()
  @IsNumber({}, { message: 'Temperature must be a number' })
  @Min(0, { message: 'Temperature must be at least 0' })
  @Max(2, { message: 'Temperature must not exceed 2' })
  temperature?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Max tokens must be a number' })
  @IsPositive({ message: 'Max tokens must be positive' })
  @Max(100000, { message: 'Max tokens must not exceed 100,000' })
  maxTokens?: number;
}

export class CreateAgentDto {
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Name must not exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @IsString({ message: 'Role must be a string' })
  @IsNotEmpty({ message: 'Role cannot be empty' })
  @MinLength(5, { message: 'Role must be at least 5 characters long' })
  @MaxLength(500, { message: 'Role must not exceed 500 characters' })
  @Transform(({ value }) => value?.trim())
  role: string;

  @IsObject({ message: 'Personality matrix must be an object' })
  @IsNotEmpty({ message: 'Personality matrix cannot be empty' })
  personalityMatrix: Record<string, any>;

  @ValidateNested()
  @Type(() => LlmConfigDto)
  @IsObject({ message: 'LLM config must be an object' })
  llmConfig: LlmConfigDto;
}
