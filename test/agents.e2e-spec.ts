import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { ProjectsModule } from '../src/projects/projects.module';
import { AgentsModule } from '../src/agents/agents.module';
import { testDatabaseConfig } from './test-database.config';

describe('AgentsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtToken: string;
  let projectId: string;

  // Setup application with PostgreSQL test database
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
        AgentsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    // Этап 1: Создаем пользователя
    const user = { email: 'agent-tester@example.com', password: 'password123' };
    await request(app.getHttpServer()).post('/auth/signup').send(user);
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(user);
    jwtToken = loginResponse.body.token;

    // Этап 2: Создаем проект, в котором будем работать
    const projectDto = {
      name: 'Проект для Тестирования Агентов',
      gitRepositoryURL: 'https://github.com/test/agents.git',
    };
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

  let agentId: string;
  const agentDto = {
    name: 'Агент-Тестировщик',
    role: 'Проверка системы',
    personalityMatrix: { stability: 1.0 },
  };

  describe('/projects/:projectId/agents', () => {
    it('POST /.../agents - должен вернуть 401 (Unauthorized) без токена', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/agents`)
        .send(agentDto)
        .expect(401);
    });

    it('POST /.../agents - должен вернуть 404 (Not Found), если проект не принадлежит пользователю', () => {
      const fakeProjectId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID format
      return request(app.getHttpServer())
        .post(`/projects/${fakeProjectId}/agents`)
        .auth(jwtToken, { type: 'bearer' })
        .send(agentDto)
        .expect(404);
    });

    it('POST /.../agents - должен успешно создать агента в проекте', () => {
      return request(app.getHttpServer())
        .post(`/projects/${projectId}/agents`)
        .auth(jwtToken, { type: 'bearer' })
        .send(agentDto)
        .expect(201)
        .then((res) => {
          expect(res.body.name).toEqual(agentDto.name);
          expect(res.body.project).toEqual(projectId);
          agentId = res.body.id; // Save ID for subsequent tests
        });
    });

    it('GET /.../agents - должен вернуть список агентов в проекте', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/agents`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body[0].id).toEqual(agentId);
        });
    });

    it('GET /.../agents/:agentId - должен вернуть конкретного агента', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/agents/${agentId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(agentId);
        });
    });

    it('DELETE /.../agents/:agentId - должен удалить агента', () => {
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}/agents/${agentId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);
    });

    it('GET /.../agents/:agentId - должен вернуть 404 (Not Found) после удаления агента', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/agents/${agentId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });
  });
});
