import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectsModule } from './projects/projects.module';
import { AgentsModule } from './agents/agents.module';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

// --- ШАГ 1: Явно импортируем ВСЕ наши сущности ---
import { User } from './auth/entities/user.entity';
import { Project } from './projects/entities/project.entity';
import { Agent } from './agents/entities/agent.entity';
import { Task } from './tasks/entities/task.entity';
// ------------------------------------------------

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
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

        // --- ШАГ 2: Заменяем сканирование на явный список ---
        entities: [User, Project, Agent, Task],
        // -----------------------------------------------------

        synchronize: true,
      }),
    }),
    EventEmitterModule.forRoot(),
    ProjectsModule,
    AgentsModule,
    TasksModule,
    AuthModule,
    OrchestratorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
