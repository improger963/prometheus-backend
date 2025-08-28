import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule } from '@nestjs/mongoose';
import { disconnect } from 'mongoose';

// ИСПРАВЛЕННЫЙ ИМПОРТ:
import request from 'supertest';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;

  // Перед всеми тестами: запускаем приложение и in-memory БД
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        // Важно переопределить подключение к БД на нашу временную
        MongooseModule.forRoot(uri),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  // После всех тестов: останавливаем приложение и БД
  afterAll(async () => {
    await disconnect();
    await mongod.stop();
    await app.close();
  });

  const user = {
    email: 'test@example.com',
    password: 'password123',
  };

  describe('/auth/signup (POST)', () => {
    it('должен успешно зарегистрировать пользователя и вернуть токен', () => {
      return request(app.getHttpServer()) // <-- Теперь это будет работать
        .post('/auth/signup')
        .send(user)
        .expect(201)
        .expect((res) => {
          expect(res.body.token).toBeDefined();
        });
    });

    it('должен вернуть ошибку 409 (Conflict) при попытке повторной регистрации', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send(user)
        .expect(409);
    });

    it('должен вернуть ошибку 400 (Bad Request) при некорректном email', () => {
      return request(app.getHttpServer())
        .post('/auth/signup')
        .send({ email: 'invalid-email', password: 'password123' })
        .expect(400);
    });
  });

  describe('/auth/login (POST)', () => {
    it('должен успешно аутентифицировать пользователя и вернуть токен', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send(user)
        .expect(200)
        .expect((res) => {
          expect(res.body.token).toBeDefined();
        });
    });

    it('должен вернуть ошибку 401 (Unauthorized) при неверном пароле', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: user.email, password: 'wrongpassword' })
        .expect(401);
    });
  });
});
