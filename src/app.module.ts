import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectsModule } from './projects/projects.module';
import { AgentsModule } from './agents/agents.module';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { KnowledgeModule } from './knowledge/knowledge.module';
import { HealthModule } from './health/health.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { validateEnvironment } from './config';
import { CustomThrottlerGuard } from './common/guards/throttler.guard';

// Import all entities explicitly
import { User } from './auth/entities/user.entity';
import { Project } from './projects/entities/project.entity';
import { Agent } from './agents/entities/agent.entity';
import { Task } from './tasks/entities/task.entity';
import { AgentMemory } from './agents/entities/agent-memory.entity';
import { KnowledgeRecord } from './knowledge/entities/knowledge-record.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true, 
      envFilePath: '.env',
      validate: validateEnvironment,
      cache: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000, // 1 minute
            limit: 100, // 100 requests per minute per IP
          },
          {
            name: 'auth',
            ttl: 900000, // 15 minutes
            limit: 5, // 5 login attempts per 15 minutes
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [User, Project, Agent, Task, AgentMemory, KnowledgeRecord],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE', false),
        logging: configService.get<boolean>('DB_LOGGING', false),
        retryDelay: 3000,
        retryAttempts: 3,
        autoLoadEntities: false, // We explicitly define entities
      }),
    }),
    EventEmitterModule.forRoot({
      // Global event emitter configuration
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 10,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
    ProjectsModule,
    AgentsModule,
    TasksModule,
    AuthModule,
    OrchestratorModule,
    KnowledgeModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}
