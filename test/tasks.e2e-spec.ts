import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { ProjectsModule } from '../src/projects/projects.module';
import { TasksModule } from '../src/tasks/tasks.module';
import { testDatabaseConfig } from './test-database.config';

describe('TasksController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtToken: string;
  let projectId: string;

  // Setup test environment with PostgreSQL database
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            JWT_SECRET: 'test-secret-key-for-testing',
          })]
        }),
        TypeOrmModule.forRoot(testDatabaseConfig),
        EventEmitterModule.forRoot(),
        AuthModule,
        ProjectsModule,
        TasksModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    const user = { email: 'task-tester@example.com', password: 'password123' };
    await request(app.getHttpServer()).post('/auth/signup').send(user);
    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send(user);
    jwtToken = loginResponse.body.token;

    const projectDto = { name: 'Проект для Тестирования Задач', gitRepositoryURL: 'https://github.com/test/tasks.git' };
    const projectResponse = await request(app.getHttpServer())
      .post('/projects')
      .auth(jwtToken, { type: 'bearer' })
      .send(projectDto);
    projectId = projectResponse.body.id;
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
    await app.close();
  });

  let taskId: string;
  const taskDto = {
    title: 'Первая тестовая задача',
    description: 'Описание для первой тестовой задачи.',
  };

  describe('/projects/:projectId/tasks', () => {
    it('POST /.../tasks - должен вернуть 401 (Unauthorized) без токена', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .send(taskDto)
        .expect(401);
    });

    it('POST /.../tasks - должен вернуть 404 (Not Found), если проект не принадлежит пользователю', () => {
      const fakeProjectId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID format
      return request(app.getHttpServer())
        .post(`/projects/${fakeProjectId}/tasks`)
        .auth(jwtToken, { type: 'bearer' })
        .send(taskDto)
        .expect(404);
    });

    it('POST /.../tasks - должен успешно создать задачу в проекте', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/tasks`)
        .auth(jwtToken, { type: 'bearer' })
        .send(taskDto)
        .expect(201)
        .then((res) => {
          expect(res.body.title).toEqual(taskDto.title);
          expect(res.body.project).toEqual(projectId);
          expect(res.body.status).toEqual('PENDING');
          taskId = res.body.id; // Save ID for subsequent tests
        });
    });

    it('GET /.../tasks - должен вернуть список задач в проекте', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body[0].id).toEqual(taskId);
        });
    });

    it('PATCH /.../tasks/:taskId - должен обновить задачу', () => {
      const updatedData = { title: 'Обновленная тестовая задача' };
      return request(app.getHttpServer())
        .patch(`/projects/${projectId}/tasks/${taskId}`)
        .auth(jwtToken, { type: 'bearer' })
        .send(updatedData)
        .expect(200)
        .then((res) => {
          expect(res.body.title).toEqual(updatedData.title);
        });
    });

    it('DELETE /.../tasks/:taskId - должен удалить задачу', () => {
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}/tasks/${taskId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);
    });

    it('GET /.../tasks/:taskId - должен вернуть 404 (Not Found) после удаления задачи', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/tasks/${taskId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });
  });
});