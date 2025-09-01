import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
} from 'class-validator';

export class CreateKnowledgeDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  content: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags: string[] = [];

  @IsEnum(['public', 'private', 'team'])
  @IsOptional()
  visibility: 'public' | 'private' | 'team' = 'public';

  @IsEnum(['general', 'technical', 'best-practice', 'troubleshooting', 'tutorial'])
  @IsOptional()
  category: 'general' | 'technical' | 'best-practice' | 'troubleshooting' | 'tutorial' = 'general';
}