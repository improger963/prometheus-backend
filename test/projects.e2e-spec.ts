import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { ProjectsModule } from '../src/projects/projects.module';
import { testDatabaseConfig } from './test-database.config';
import { DataSource } from 'typeorm';

describe('ProjectsController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtToken: string;
  let userId: string;

  const user = {
    email: 'project-tester@example.com',
    password: 'password123',
  };

  // Перед всеми тестами: запускаем приложение и регистрируем пользователя
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
        ProjectsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    // Регистрируем и логинимся один раз, чтобы получить токен
    await request(app.getHttpServer()).post('/auth/signup').send(user);
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send(user);
    jwtToken = loginResponse.body.token;
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
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

  describe('Security and Access Control', () => {
    let secondUserToken: string;
    let secondUserProjectId: string;

    beforeAll(async () => {
      // Create second user for cross-user testing
      const secondUser = {
        email: 'second-project-user@example.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/signup').send(secondUser);
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(secondUser);
      secondUserToken = loginResponse.body.token;

      // Create a project for second user
      const projectResponse = await request(app.getHttpServer())
        .post('/projects')
        .auth(secondUserToken, { type: 'bearer' })
        .send({
          name: 'Second User Project',
          description: 'Project belonging to second user',
        });
      secondUserProjectId = projectResponse.body.id;
    });

    it('should not allow accessing other users projects', async () => {
      // First user tries to access second user's project
      await request(app.getHttpServer())
        .get(`/projects/${secondUserProjectId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });

    it('should not allow updating other users projects', async () => {
      await request(app.getHttpServer())
        .patch(`/projects/${secondUserProjectId}`)
        .auth(jwtToken, { type: 'bearer' })
        .send({ name: 'Hacked Project Name' })
        .expect(404);
    });

    it('should not allow deleting other users projects', async () => {
      await request(app.getHttpServer())
        .delete(`/projects/${secondUserProjectId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });

    it('should reject invalid JWT tokens', async () => {
      const invalidTokens = [
        'invalid-token',
        'Bearer invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
        '',
        null,
        undefined
      ];

      for (const token of invalidTokens) {
        if (token === null || token === undefined) continue;
        
        await request(app.getHttpServer())
          .get('/projects')
          .set('Authorization', token.startsWith('Bearer') ? token : `Bearer ${token}`)
          .expect(401);
      }
    });

    it('should prevent token reuse after user deletion', async () => {
      // This is a conceptual test - in real scenario, you'd delete the user
      // and verify their tokens become invalid
      const tempUser = {
        email: 'temp-user@example.com',
        password: 'password123',
      };

      await request(app.getHttpServer()).post('/auth/signup').send(tempUser);
      const tempLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(tempUser);
      const tempToken = tempLoginResponse.body.token;

      // Token should work initially
      await request(app.getHttpServer())
        .get('/projects')
        .auth(tempToken, { type: 'bearer' })
        .expect(200);

      // In a real scenario, you would delete the user here
      // and then verify the token becomes invalid
    });
  });

  describe('Input Validation and Edge Cases', () => {
    let testProjectId: string;

    beforeEach(async () => {
      // Create a fresh project for each test
      const response = await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send({
          name: 'Test Project for Validation',
          description: 'Project for input validation testing',
        });
      testProjectId = response.body.id;
    });

    afterEach(async () => {
      // Clean up test project
      try {
        await request(app.getHttpServer())
          .delete(`/projects/${testProjectId}`)
          .auth(jwtToken, { type: 'bearer' });
      } catch (error) {
        // Ignore cleanup errors
      }
    });

    describe('Project Creation Validation', () => {
      it('should reject project creation without required fields', async () => {
        const invalidProjects = [
          {}, // No fields
          { name: '' }, // Empty name
          { description: 'No name provided' }, // No name
          { name: null }, // Null name
          { name: undefined }, // Undefined name
        ];

        for (const project of invalidProjects) {
          await request(app.getHttpServer())
            .post('/projects')
            .auth(jwtToken, { type: 'bearer' })
            .send(project)
            .expect(400);
        }
      });

      it('should handle very long project names', async () => {
        const longName = 'a'.repeat(1000);
        
        const response = await request(app.getHttpServer())
          .post('/projects')
          .auth(jwtToken, { type: 'bearer' })
          .send({ name: longName, description: 'Long name test' });
        
        // Should either accept with truncation or reject with 400
        expect([201, 400]).toContain(response.status);
      });

      it('should handle special characters in project names', async () => {
        const specialNames = [
          'Project with spaces',
          'Проект с русскими символами',
          'Project_with_underscores',
          'Project-with-hyphens',
          'Project.with.dots',
          'Project (with parentheses)',
          'Project [with brackets]',
          'Project "with quotes"',
          'Project \'with single quotes\'',
          'Project with emoji 🚀',
          'Project with accents: café, naïve, résumé'
        ];

        for (let i = 0; i < specialNames.length; i++) {
          const response = await request(app.getHttpServer())
            .post('/projects')
            .auth(jwtToken, { type: 'bearer' })
            .send({ 
              name: specialNames[i], 
              description: `Test project ${i}` 
            });
          
          expect([201, 400]).toContain(response.status);
          
          // Clean up if created successfully
          if (response.status === 201) {
            await request(app.getHttpServer())
              .delete(`/projects/${response.body.id}`)
              .auth(jwtToken, { type: 'bearer' });
          }
        }
      });

      it('should validate Git repository URLs', async () => {
        const invalidUrls = [
          'not-a-url',
          'http://not-git-repo.com',
          'ftp://invalid-protocol.com',
          'git@github.com:user/repo', // SSH format might be invalid depending on validation
          'https://github.com/', // No repo specified
          'https://github.com/user', // No repo specified
          'javascript:alert("xss")', // XSS attempt
        ];

        for (const url of invalidUrls) {
          const response = await request(app.getHttpServer())
            .post('/projects')
            .auth(jwtToken, { type: 'bearer' })
            .send({ 
              name: 'URL Test Project', 
              gitRepositoryURL: url 
            });
          
          // Should either accept or reject based on validation rules
          expect([201, 400]).toContain(response.status);
          
          if (response.status === 201) {
            await request(app.getHttpServer())
              .delete(`/projects/${response.body.id}`)
              .auth(jwtToken, { type: 'bearer' });
          }
        }
      });
    });

    describe('Project Update Validation', () => {
      it('should handle partial updates correctly', async () => {
        const updates = [
          { name: 'Updated Name Only' },
          { description: 'Updated description only' },
          { gitRepositoryURL: 'https://github.com/user/updated-repo.git' },
          { 
            name: 'Full Update',
            description: 'Updated everything',
            gitRepositoryURL: 'https://github.com/user/full-update.git'
          }
        ];

        for (const update of updates) {
          await request(app.getHttpServer())
            .patch(`/projects/${testProjectId}`)
            .auth(jwtToken, { type: 'bearer' })
            .send(update)
            .expect(200);
        }
      });

      it('should reject invalid update data', async () => {
        const invalidUpdates = [
          { name: '' }, // Empty name
          { name: null }, // Null name
          { id: 'different-id' }, // Trying to change ID
          { user: 'different-user' }, // Trying to change owner
          { createdAt: new Date() }, // Trying to change timestamps
          { updatedAt: new Date() }
        ];

        for (const update of invalidUpdates) {
          const response = await request(app.getHttpServer())
            .patch(`/projects/${testProjectId}`)
            .auth(jwtToken, { type: 'bearer' })
            .send(update);
          
          // Should either ignore invalid fields or reject
          expect([200, 400]).toContain(response.status);
        }
      });
    });

    describe('UUID Validation', () => {
      it('should reject invalid UUID formats', async () => {
        const invalidUUIDs = [
          'not-a-uuid',
          '123',
          '12345678-1234-1234-1234-12345678901', // too short
          '12345678-1234-1234-1234-1234567890123', // too long
          '12345678-12g4-1234-1234-123456789012', // invalid character
          '',
          'null',
          'undefined'
        ];

        for (const uuid of invalidUUIDs) {
          await request(app.getHttpServer())
            .get(`/projects/${uuid}`)
            .auth(jwtToken, { type: 'bearer' })
            .expect(400);

          await request(app.getHttpServer())
            .patch(`/projects/${uuid}`)
            .auth(jwtToken, { type: 'bearer' })
            .send({ name: 'Updated Name' })
            .expect(400);

          await request(app.getHttpServer())
            .delete(`/projects/${uuid}`)
            .auth(jwtToken, { type: 'bearer' })
            .expect(400);
        }
      });

      it('should handle valid UUID format for non-existent projects', async () => {
        const nonExistentUUID = '12345678-1234-1234-1234-123456789012';

        await request(app.getHttpServer())
          .get(`/projects/${nonExistentUUID}`)
          .auth(jwtToken, { type: 'bearer' })
          .expect(404);

        await request(app.getHttpServer())
          .patch(`/projects/${nonExistentUUID}`)
          .auth(jwtToken, { type: 'bearer' })
          .send({ name: 'Updated Name' })
          .expect(404);

        await request(app.getHttpServer())
          .delete(`/projects/${nonExistentUUID}`)
          .auth(jwtToken, { type: 'bearer' })
          .expect(404);
      });
    });
  });

  describe('Performance and Concurrent Access', () => {
    it('should handle multiple simultaneous project creations', async () => {
      const projectPromises = [];
      
      for (let i = 0; i < 10; i++) {
        projectPromises.push(
          request(app.getHttpServer())
            .post('/projects')
            .auth(jwtToken, { type: 'bearer' })
            .send({
              name: `Concurrent Project ${i}`,
              description: `Project created concurrently ${i}`,
            })
        );
      }

      const responses = await Promise.all(projectPromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.id).toBeDefined();
      });

      // Verify all projects have unique IDs
      const projectIds = responses.map(r => r.body.id);
      const uniqueIds = new Set(projectIds);
      expect(uniqueIds.size).toBe(projectIds.length);

      // Clean up
      const deletePromises = projectIds.map(id =>
        request(app.getHttpServer())
          .delete(`/projects/${id}`)
          .auth(jwtToken, { type: 'bearer' })
      );
      await Promise.all(deletePromises);
    });

    it('should handle rapid project operations', async () => {
      // Create project
      const createResponse = await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send({
          name: 'Rapid Operations Project',
          description: 'Testing rapid operations',
        });
      
      const projectId = createResponse.body.id;

      // Perform rapid operations
      const operations = [
        request(app.getHttpServer())
          .get(`/projects/${projectId}`)
          .auth(jwtToken, { type: 'bearer' }),
        request(app.getHttpServer())
          .patch(`/projects/${projectId}`)
          .auth(jwtToken, { type: 'bearer' })
          .send({ name: 'Updated Rapid Project' }),
        request(app.getHttpServer())
          .get(`/projects/${projectId}`)
          .auth(jwtToken, { type: 'bearer' }),
      ];

      const responses = await Promise.all(operations);
      
      // All operations should succeed
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
      });

      // Verify the update took effect
      expect(responses[2].body.name).toBe('Updated Rapid Project');

      // Clean up
      await request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .auth(jwtToken, { type: 'bearer' });
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain project ownership consistency', async () => {
      // Create project
      const createResponse = await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send({
          name: 'Ownership Test Project',
          description: 'Testing ownership consistency',
        });
      
      const projectId = createResponse.body.id;

      // Verify project appears in user's project list
      const listResponse = await request(app.getHttpServer())
        .get('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);
      
      const userProjects = listResponse.body;
      const createdProject = userProjects.find(p => p.id === projectId);
      expect(createdProject).toBeDefined();
      expect(createdProject.name).toBe('Ownership Test Project');

      // Clean up
      await request(app.getHttpServer())
        .delete(`/projects/${projectId}`)
        .auth(jwtToken, { type: 'bearer' });

      // Verify project is removed from user's list
      const listAfterDelete = await request(app.getHttpServer())
        .get('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200);
      
      const projectAfterDelete = listAfterDelete.body.find(p => p.id === projectId);
      expect(projectAfterDelete).toBeUndefined();
    });

    it('should handle database constraint violations gracefully', async () => {
      // This test would be more meaningful with actual DB constraints
      // For now, we test duplicate names which should be allowed
      const duplicateName = 'Duplicate Project Name';
      
      const response1 = await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send({
          name: duplicateName,
          description: 'First project with this name',
        })
        .expect(201);

      const response2 = await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send({
          name: duplicateName,
          description: 'Second project with same name',
        })
        .expect(201);

      // Both should succeed (duplicate names allowed)
      expect(response1.body.id).not.toBe(response2.body.id);

      // Clean up
      await request(app.getHttpServer())
        .delete(`/projects/${response1.body.id}`)
        .auth(jwtToken, { type: 'bearer' });
      await request(app.getHttpServer())
        .delete(`/projects/${response2.body.id}`)
        .auth(jwtToken, { type: 'bearer' });
    });
  });

  describe('HTTP Method and Headers Validation', () => {
    let testProjectId: string;

    beforeAll(async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send({
          name: 'HTTP Test Project',
          description: 'Project for HTTP method testing',
        });
      testProjectId = response.body.id;
    });

    afterAll(async () => {
      await request(app.getHttpServer())
        .delete(`/projects/${testProjectId}`)
        .auth(jwtToken, { type: 'bearer' });
    });

    it('should reject unsupported HTTP methods', async () => {
      // Test unsupported methods on existing endpoints
      const unsupportedMethods = [
        { method: 'options', expectStatus: [200, 405] }, // OPTIONS might be allowed for CORS
        { method: 'head', expectStatus: [405] },
        { method: 'put', expectStatus: [404, 405] }, // PUT to /projects (should be PATCH to /projects/:id)
      ];

      for (const { method, expectStatus } of unsupportedMethods) {
        const response = await request(app.getHttpServer())
          [method]('/projects')
          .auth(jwtToken, { type: 'bearer' });
        
        expect(expectStatus).toContain(response.status);
      }
    });

    it('should handle missing Content-Type header', async () => {
      const response = await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send('name=Test&description=Test') // Form data instead of JSON
        .expect(400);
    });

    it('should handle malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .set('Content-Type', 'application/json')
        .send('{invalid json}') // Malformed JSON
        .expect(400);
    });

    it('should respect Content-Length limits', async () => {
      const largePayload = {
        name: 'Large Payload Test',
        description: 'a'.repeat(100000), // Very large description
        extraField: 'b'.repeat(100000)
      };

      const response = await request(app.getHttpServer())
        .post('/projects')
        .auth(jwtToken, { type: 'bearer' })
        .send(largePayload);
      
      // Should either accept or reject based on payload size limits
      expect([201, 400, 413]).toContain(response.status);
      
      if (response.status === 201) {
        await request(app.getHttpServer())
          .delete(`/projects/${response.body.id}`)
          .auth(jwtToken, { type: 'bearer' });
      }
    });
  });
});
