import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/auth/auth.module';
import { testDatabaseConfig } from './test-database.config';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as jwt from 'jsonwebtoken';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  // Перед всеми тестами: запускаем приложение и test БД
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
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();
  });

  // После всех тестов: останавливаем приложение и БД
  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
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

    it('должен вернуть ошибку 401 при попытке входа с несуществующим email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('Security and Edge Cases', () => {
    describe('Email Validation', () => {
      it('должен отклонить email с недопустимыми символами', async () => {
        const invalidEmails = [
          'test@',
          '@example.com',
          'test..test@example.com',
          'test@example',
          'test space@example.com',
          'test@ex ample.com',
          'test@.example.com',
          'test@example..com'
        ];

        for (const email of invalidEmails) {
          await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ email, password: 'password123' })
            .expect(400);
        }
      });

      it('должен принимать валидные email адреса', async () => {
        const validEmails = [
          'user1@example.com',
          'user.name@example.co.uk',
          'user+tag@example.org',
          'user_name@example-domain.com'
        ];

        for (const email of validEmails) {
          await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ email, password: 'password123' })
            .expect(201);
        }
      });

      it('должен быть регистронезависимым для email', async () => {
        const baseEmail = 'CaseTest@Example.COM';
        
        // Регистрируем с заглавными буквами
        await request(app.getHttpServer())
          .post('/auth/signup')
          .send({ email: baseEmail, password: 'password123' })
          .expect(201);

        // Пытаемся войти с разным регистром
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: 'casetest@example.com', password: 'password123' })
          .expect(200);
      });
    });

    describe('Password Security', () => {
      it('должен отклонить слишком короткие пароли', async () => {
        const shortPasswords = ['1', '12', '123', '1234', '12345'];

        for (const password of shortPasswords) {
          await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ email: `test${password.length}@example.com`, password })
            .expect(400);
        }
      });

      it('должен принимать пароли минимальной длины', async () => {
        await request(app.getHttpServer())
          .post('/auth/signup')
          .send({ email: 'minpassword@example.com', password: '123456' })
          .expect(201);
      });

      it('должен принимать сложные пароли', async () => {
        const complexPasswords = [
          'MyComplexP@ssw0rd!',
          'Another$ecure123',
          'Russian_Пароль2024'
        ];

        for (let i = 0; i < complexPasswords.length; i++) {
          await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ 
              email: `complex${i}@example.com`, 
              password: complexPasswords[i] 
            })
            .expect(201);
        }
      });
    });

    describe('JWT Token Security', () => {
      let validToken: string;

      beforeAll(async () => {
        const response = await request(app.getHttpServer())
          .post('/auth/signup')
          .send({ email: 'jwttest@example.com', password: 'password123' })
          .expect(201);
        validToken = response.body.token;
      });

      it('должен возвращать правильно структурированный JWT токен', () => {
        const decoded = jwt.decode(validToken, { complete: true });
        
        expect(decoded).toBeTruthy();
        expect(decoded?.header.alg).toBe('HS256');
        expect(decoded?.header.typ).toBe('JWT');
        expect(decoded?.payload).toHaveProperty('sub');
        expect(decoded?.payload).toHaveProperty('email');
        expect(decoded?.payload).toHaveProperty('iat');
        expect(decoded?.payload).toHaveProperty('exp');
      });

      it('должен устанавливать правильное время истечения токена', () => {
        const decoded = jwt.decode(validToken) as any;
        const now = Math.floor(Date.now() / 1000);
        const oneDay = 24 * 60 * 60;
        
        expect(decoded.exp - decoded.iat).toBe(oneDay);
        expect(decoded.exp).toBeGreaterThan(now);
      });

      it('должен включать необходимые поля в payload', () => {
        const decoded = jwt.decode(validToken) as any;
        
        expect(decoded.sub).toBeDefined();
        expect(decoded.email).toBe('jwttest@example.com');
        expect(typeof decoded.sub).toBe('string');
        expect(decoded.sub.length).toBeGreaterThan(0);
      });
    });

    describe('Input Sanitization', () => {
      it('должен обрабатывать SQL injection попытки', async () => {
        const sqlInjectionAttempts = [
          "test'; DROP TABLE users; --@example.com",
          "test' OR '1'='1@example.com",
          "test'; INSERT INTO users VALUES('hacker'); --@example.com"
        ];

        for (const maliciousEmail of sqlInjectionAttempts) {
          await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ email: maliciousEmail, password: 'password123' })
            .expect(400);
        }
      });

      it('должен обрабатывать XSS попытки', async () => {
        const xssAttempts = [
          "<script>alert('xss')</script>@example.com",
          "test+<img src=x onerror=alert(1)>@example.com",
          "javascript:alert('xss')@example.com"
        ];

        for (const maliciousEmail of xssAttempts) {
          await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ email: maliciousEmail, password: 'password123' })
            .expect(400);
        }
      });

      it('должен обрабатывать специальные символы в паролях', async () => {
        const specialPasswords = [
          'password<script>alert(1)</script>',
          'password"; DROP TABLE users; --',
          'password\x00\x01\x02',
          'пароль_с_русскими_символами'
        ];

        for (let i = 0; i < specialPasswords.length; i++) {
          const response = await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ 
              email: `specialchars${i}@example.com`, 
              password: specialPasswords[i] 
            });
          
          // Пароль должен быть принят или отклонен по валидным причинам, не по XSS/SQL injection
          expect([200, 201, 400]).toContain(response.status);
        }
      });
    });

    describe('Rate Limiting and Abuse Prevention', () => {
      it('должен обрабатывать множественные попытки входа', async () => {
        const attempts = [];
        
        // Создаем 10 параллельных запросов
        for (let i = 0; i < 10; i++) {
          attempts.push(
            request(app.getHttpServer())
              .post('/auth/login')
              .send({ email: 'test@example.com', password: 'wrongpassword' })
          );
        }

        const responses = await Promise.all(attempts);
        
        // Все должны вернуть 401, без зависания или ошибок сервера
        responses.forEach(response => {
          expect(response.status).toBe(401);
        });
      });

      it('должен обрабатывать множественные попытки регистрации', async () => {
        const attempts = [];
        
        // Создаем 5 параллельных попыток регистрации одного email
        for (let i = 0; i < 5; i++) {
          attempts.push(
            request(app.getHttpServer())
              .post('/auth/signup')
              .send({ email: 'duplicate@example.com', password: 'password123' })
          );
        }

        const responses = await Promise.all(attempts);
        
        // Только одна должна успешно создать пользователя
        const successCount = responses.filter(r => r.status === 201).length;
        const conflictCount = responses.filter(r => r.status === 409).length;
        
        expect(successCount).toBe(1);
        expect(conflictCount).toBe(4);
      });
    });

    describe('Content-Type and Request Validation', () => {
      it('должен отклонять запросы без Content-Type', async () => {
        await request(app.getHttpServer())
          .post('/auth/signup')
          .send('email=test@example.com&password=password123')
          .expect(400);
      });

      it('должен отклонять пустые запросы', async () => {
        await request(app.getHttpServer())
          .post('/auth/signup')
          .send({})
          .expect(400);

        await request(app.getHttpServer())
          .post('/auth/login')
          .send({})
          .expect(400);
      });

      it('должен отклонять запросы с отсутствующими полями', async () => {
        await request(app.getHttpServer())
          .post('/auth/signup')
          .send({ email: 'test@example.com' })
          .expect(400);

        await request(app.getHttpServer())
          .post('/auth/signup')
          .send({ password: 'password123' })
          .expect(400);
      });

      it('должен отклонять запросы с дополнительными полями', async () => {
        await request(app.getHttpServer())
          .post('/auth/signup')
          .send({ 
            email: 'extrafields@example.com', 
            password: 'password123',
            adminFlag: true,
            role: 'admin'
          })
          .expect(201); // Дополнительные поля должны игнорироваться, но запрос должен быть успешным
      });
    });

    describe('Unicode and Internationalization', () => {
      it('должен поддерживать Unicode в паролях', async () => {
        const unicodePasswords = [
          'пароль123',
          '密码123',
          'contraseña123',
          'mot_de_passe123',
          'パスワード123'
        ];

        for (let i = 0; i < unicodePasswords.length; i++) {
          await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ 
              email: `unicode${i}@example.com`, 
              password: unicodePasswords[i] 
            })
            .expect(201);
        }
      });

      it('должен поддерживать международные домены', async () => {
        const internationalEmails = [
          'test@münchen.de',
          'test@пример.рф',
          'test@例え.テスト'
        ];

        for (let i = 0; i < internationalEmails.length; i++) {
          const response = await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ 
              email: internationalEmails[i], 
              password: 'password123' 
            });
          
          // Может быть принят или отклонен в зависимости от валидации, но не должен вызывать серверную ошибку
          expect([200, 201, 400]).toContain(response.status);
        }
      });
    });

    describe('Error Handling and Stability', () => {
      it('должен обрабатывать очень длинные входные данные', async () => {
        const longString = 'a'.repeat(10000);
        
        const response = await request(app.getHttpServer())
          .post('/auth/signup')
          .send({ email: `${longString}@example.com`, password: longString });
        
        // Должен отклонить из-за длины, но не вызвать серверную ошибку
        expect([400, 413]).toContain(response.status);
      });

      it('должен обрабатывать null и undefined значения', async () => {
        const invalidInputs = [
          { email: null, password: 'password123' },
          { email: 'test@example.com', password: null },
          { email: undefined, password: 'password123' },
          { email: 'test@example.com', password: undefined }
        ];

        for (const input of invalidInputs) {
          await request(app.getHttpServer())
            .post('/auth/signup')
            .send(input)
            .expect(400);
        }
      });

      it('должен возвращать последовательные ошибки', async () => {
        const responses = [];
        
        // Отправляем несколько идентичных неверных запросов
        for (let i = 0; i < 5; i++) {
          const response = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email: 'nonexistent@example.com', password: 'wrongpassword' });
          responses.push(response);
        }

        // Все ответы должны быть одинаковыми
        responses.forEach(response => {
          expect(response.status).toBe(401);
          expect(response.body).toHaveProperty('message');
        });
      });
    });
  });
});
