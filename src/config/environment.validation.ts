import { IsString, IsNumber, IsOptional, IsUrl, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export enum Environment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  TEST = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.DEVELOPMENT;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  PORT: number = 3000;

  // Database Configuration
  @IsString()
  DB_HOST: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_DATABASE: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  DB_SYNCHRONIZE: boolean = false;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  DB_LOGGING: boolean = false;

  // JWT Configuration
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  // External Services
  @IsUrl()
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000';

  // LLM Provider Configuration
  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  GROQ_API_KEY?: string;

  @IsString()
  @IsOptional()
  MISTRAL_API_KEY?: string;

  @IsString()
  @IsOptional()
  GEMINI_API_KEY?: string;

  // Docker Configuration
  @IsString()
  @IsOptional()
  DOCKER_SOCKET_PATH: string = '/var/run/docker.sock';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DOCKER_TIMEOUT: number = 300000; // 5 minutes

  // Test Database Configuration (for testing environment)
  @IsString()
  @IsOptional()
  TEST_DB_HOST?: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  TEST_DB_PORT?: number;

  @IsString()
  @IsOptional()
  TEST_DB_USER?: string;

  @IsString()
  @IsOptional()
  TEST_DB_PASSWORD?: string;

  @IsString()
  @IsOptional()
  TEST_DB_NAME?: string;
}