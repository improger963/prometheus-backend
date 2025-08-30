import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { disconnect, Types } from 'mongoose';

describe('AgentsController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let jwtToken: string;
  let projectId: string;

  // Перед всеми тестами: запускаем приложение, регистрируем пользователя и создаем проект
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
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
    projectId = projectResponse.body._id;
  });

  afterAll(async () => {
    await disconnect();
    await mongod.stop();
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
      const fakeProjectId = new Types.ObjectId().toHexString(); // Генерируем валидный, но несуществующий ID
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
          agentId = res.body._id; // Сохраняем ID для следующих тестов
        });
    });

    it('GET /.../agents - должен вернуть список агентов в проекте', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/agents`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body[0]._id).toEqual(agentId);
        });
    });

    it('GET /.../agents/:agentId - должен вернуть конкретного агента', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}/agents/${agentId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body._id).toEqual(agentId);
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
