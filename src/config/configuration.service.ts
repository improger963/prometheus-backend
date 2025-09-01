import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from './environment.validation';

export interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  synchronize: boolean;
  logging: boolean;
  entities: any[];
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface LlmConfig {
  openai?: {
    apiKey: string;
  };
  groq?: {
    apiKey: string;
  };
  mistral?: {
    apiKey: string;
  };
  gemini?: {
    apiKey: string;
  };
}

export interface DockerConfig {
  socketPath: string;
  timeout: number;
}

export class ConfigurationService {
  constructor(private configService: ConfigService<EnvironmentVariables>) {}

  get environment(): string {
    return this.configService.get('NODE_ENV', 'development');
  }

  get port(): number {
    return this.configService.get('PORT', 3000);
  }

  get frontendUrl(): string {
    return this.configService.get('FRONTEND_URL', 'http://localhost:3000');
  }

  getDatabaseConfig(): DatabaseConfig {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DB_HOST') || 'localhost',
      port: this.configService.get<number>('DB_PORT') || 5432,
      username: this.configService.get<string>('DB_USERNAME') || 'postgres',
      password: this.configService.get<string>('DB_PASSWORD') || 'password',
      database: this.configService.get<string>('DB_DATABASE') || 'prometheus_db',
      synchronize: this.configService.get('DB_SYNCHRONIZE', false),
      logging: this.configService.get('DB_LOGGING', false),
      entities: [], // Will be set in module
    };
  }

  getJwtConfig(): JwtConfig {
    return {
      secret: this.configService.get<string>('JWT_SECRET') || 'default-secret-key-for-development',
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    };
  }

  getLlmConfig(): LlmConfig {
    const config: LlmConfig = {};

    const openaiKey = this.configService.get('OPENAI_API_KEY');
    if (openaiKey) {
      config.openai = { apiKey: openaiKey };
    }

    const groqKey = this.configService.get('GROQ_API_KEY');
    if (groqKey) {
      config.groq = { apiKey: groqKey };
    }

    const mistralKey = this.configService.get('MISTRAL_API_KEY');
    if (mistralKey) {
      config.mistral = { apiKey: mistralKey };
    }

    const geminiKey = this.configService.get('GEMINI_API_KEY');
    if (geminiKey) {
      config.gemini = { apiKey: geminiKey };
    }

    return config;
  }

  getDockerConfig(): DockerConfig {
    return {
      socketPath: this.configService.get('DOCKER_SOCKET_PATH', '/var/run/docker.sock'),
      timeout: this.configService.get('DOCKER_TIMEOUT', 300000),
    };
  }

  isProduction(): boolean {
    return this.environment === 'production';
  }

  isDevelopment(): boolean {
    return this.environment === 'development';
  }

  isTest(): boolean {
    return this.environment === 'test';
  }
}