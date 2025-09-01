import { plainToClass, Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync, IsOptional, IsUrl, IsBoolean } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number;

  // Database
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

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string;

  // External Services
  @IsUrl({
    require_protocol: true,
    protocols: ['http', 'https']
  })
  @IsOptional()
  FRONTEND_URL: string;

  // LLM APIs (optional)
  @IsString()
  @IsOptional()
  OPENAI_API_KEY: string;

  @IsString()
  @IsOptional()
  GROQ_API_KEY: string;

  @IsString()
  @IsOptional()
  MISTRAL_API_KEY: string;

  @IsString()
  @IsOptional()
  GEMINI_API_KEY: string;

  // Docker
  @IsString()
  @IsOptional()
  DOCKER_SOCKET_PATH: string;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map(
      (error) => `${error.property}: ${Object.values(error.constraints || {}).join(', ')}`,
    );
    throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
  }

  return validatedConfig;
}