import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsString,
  ValidateNested,
} from 'class-validator';

class LlmConfigDto {
  @IsEnum(['google', 'openai', 'groq'])
  @IsNotEmpty()
  provider: 'google' | 'openai' | 'groq';

  @IsString()
  @IsNotEmpty()
  model: string;
}

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  role: string;

  @IsObject()
  @IsNotEmpty()
  personalityMatrix: Record<string, any>;

  @ValidateNested()
  @Type(() => LlmConfigDto)
  @IsObject()
  llmConfig: LlmConfigDto;
}
