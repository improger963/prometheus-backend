import { 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  IsUrl, 
  MaxLength,
  MinLength 
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({
    description: 'Project name',
    example: 'My AI Assistant Project',
    minLength: 3,
    maxLength: 255
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Project name cannot be empty' })
  @MinLength(3, { message: 'Project name must be at least 3 characters long' })
  @MaxLength(255, { message: 'Project name must not exceed 255 characters' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({
    description: 'Project description',
    example: 'An AI-powered assistant for automating development tasks',
    maxLength: 5000
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(5000, { message: 'Description must not exceed 5000 characters' })
  @Transform(({ value }) => value?.trim())
  description?: string;

  @ApiPropertyOptional({
    description: 'Git repository URL for the project',
    example: 'https://github.com/username/my-project.git',
    format: 'uri',
    maxLength: 500
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid git repository URL' })
  @MaxLength(500, { message: 'Git repository URL must not exceed 500 characters' })
  gitRepositoryURL?: string;

  @ApiPropertyOptional({
    description: 'Base Docker image for the project environment',
    example: 'node:18-alpine',
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'Base Docker image must be a string' })
  @MaxLength(100, { message: 'Docker image name must not exceed 100 characters' })
  baseDockerImage?: string;

  @ApiPropertyOptional({
    description: 'Git access token for private repositories',
    example: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'Git access token must be a string' })
  @MaxLength(500, { message: 'Git access token must not exceed 500 characters' })
  gitAccessToken?: string;
}
