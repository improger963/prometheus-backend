import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { disconnect } from 'mongoose';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let jwtToken: string;
  let userId: string;

  const user = {
    email: 'project-tester@example.com',
    password: 'password123',
  };

  // Перед всеми тестами: запускаем приложение и регистрируем пользователя
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(uri), AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    // Регистрируем и логинимся один раз, чтобы получить токен
    await request(app.getHttpServer()).post('/auth/signup').send(user);
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(user);
    jwtToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await disconnect();
    await mongod.stop();
    await app.close();
  });

  let projectId: string;

  describe('/projects', () => {
    it('GET /projects - должен вернуть 401 (Unauthorized) без токена', () => {
      return request(app.getHttpServer()).get('/projects').expect(401);
    });

    it('POST /projects - должен создать проект для аутентифицированного пользователя', async () => {
      const projectDto = {
        name: 'Тестовый Проект',
        gitRepositoryURL: 'https://github.com/test/repo.git',
      };

      return request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send(projectDto)
        .expect(201)
        .then((res) => {
          expect(res.body.name).toEqual(projectDto.name);
          expect(res.body._id).toBeDefined();
          projectId = res.body._id; // Сохраняем ID для следующих тестов
        });
    });

    it('GET /projects - должен вернуть список проектов пользователя', () => {
      return request(app.getHttpServer())
        .get('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]._id).toEqual(projectId);
        });
    });

    it('GET /projects/:id - должен вернуть конкретный проект по ID', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body._id).toEqual(projectId);
        });
    });

    it('PATCH /projects/:id - должен обновить проект', () => {
      const updatedData = { name: 'Обновленный Тестовый Проект' };
      return request(app.getHttpServer())
        .patch(`/projects/${projectId}`)
        .auth(jwtToken, { type: 'bearer' })
        .send(updatedData)
        .expect(200)
        .then((res) => {
          expect(res.body.name).toEqual(updatedData.name);
        });
    });

    it('DELETE /projects/:id - должен удалить проект', () => {
      return request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);
    });

    it('GET /projects/:id - должен вернуть 404 (Not Found) после удаления', () => {
      return request(app.getHttpServer())
        .get(`/projects/${projectId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });
  });
});
