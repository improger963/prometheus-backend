import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectsModule } from './projects/projects.module';
import { AgentsModule } from './agents/agents.module';
import { TasksModule } from './tasks/tasks.module';
import { AuthModule } from './auth/auth.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { EventEmitterModule } from '@nestjs/event-emitter'; // <-- 1. Импортируем

@Module({
  imports: [
    // 1. Глобальная загрузка конфигурации из .env файла
    ConfigModule.forRoot({
      isGlobal: true, // Делаем конфигурацию доступной во всем приложении
      envFilePath: '.env',
    }),

    // 2. Асинхронное подключение к MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule], // Импортируем ConfigModule, чтобы получить доступ к ConfigService
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'), // Берем строку подключения из .env
      }),
    }),

    // 3. Подключаем все наши модули
    ProjectsModule,
    AgentsModule,
    TasksModule,
    AuthModule,
    OrchestratorModule,
    EventEmitterModule.forRoot(), // <-- 2. Регистрируем модуль
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
