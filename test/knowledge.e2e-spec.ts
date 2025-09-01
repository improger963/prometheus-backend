import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import request from 'supertest';
import { AuthModule } from '../src/auth/auth.module';
import { KnowledgeModule } from '../src/knowledge/knowledge.module';
import { testDatabaseConfig } from './test-database.config';
import { DataSource } from 'typeorm';

describe('KnowledgeController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let jwtToken: string;

  const user = {
    email: 'knowledge-tester@example.com',
    password: 'password123',
  };

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
        KnowledgeModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    dataSource = moduleFixture.get<DataSource>(DataSource);
    await app.init();

    // Register and login user to get JWT token
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

  let knowledgeId: string;

  describe('/knowledge (POST)', () => {
    it('should create knowledge record with valid data', () => {
      const knowledgeDto = {
        title: 'Test Knowledge Record',
        content: 'This is a comprehensive test knowledge record with detailed content',
        tags: ['test', 'example', 'documentation'],
        visibility: 'public',
        category: 'technical'
      };

      return request(app.getHttpServer())
        .post('/knowledge')
        .auth(jwtToken, { type: 'bearer' })
        .send(knowledgeDto)
        .expect(201)
        .then((res) => {
          expect(res.body.title).toEqual(knowledgeDto.title);
          expect(res.body.content).toEqual(knowledgeDto.content);
          expect(res.body.tags).toEqual(knowledgeDto.tags);
          expect(res.body.visibility).toEqual(knowledgeDto.visibility);
          expect(res.body.category).toEqual(knowledgeDto.category);
          expect(res.body.useCount).toEqual(0);
          expect(res.body.rating).toEqual(0.0);
          expect(res.body.ratingCount).toEqual(0);
          expect(res.body.id).toBeDefined();
          expect(res.body.createdAt).toBeDefined();
          expect(res.body.updatedAt).toBeDefined();
          knowledgeId = res.body.id;
        });
    });

    it('should create knowledge record with minimal required fields', () => {
      const minimalKnowledgeDto = {
        title: 'Minimal Knowledge',
        content: 'Minimal content'
      };

      return request(app.getHttpServer())
        .post('/knowledge')
        .auth(jwtToken, { type: 'bearer' })
        .send(minimalKnowledgeDto)
        .expect(201)
        .then((res) => {
          expect(res.body.title).toEqual(minimalKnowledgeDto.title);
          expect(res.body.content).toEqual(minimalKnowledgeDto.content);
          expect(res.body.tags).toEqual([]);
          expect(res.body.visibility).toEqual('private'); // Default value
        });
    });

    it('should return 401 (Unauthorized) without token', () => {
      const knowledgeDto = {
        title: 'Unauthorized Test',
        content: 'This should fail'
      };

      return request(app.getHttpServer())
        .post('/knowledge')
        .send(knowledgeDto)
        .expect(401);
    });

    it('should return 400 (Bad Request) with invalid data', () => {
      const invalidKnowledgeDto = {
        title: '', // Empty title should fail validation
        content: 'Valid content'
      };

      return request(app.getHttpServer())
        .post('/knowledge')
        .auth(jwtToken, { type: 'bearer' })
        .send(invalidKnowledgeDto)
        .expect(400);
    });

    it('should return 400 (Bad Request) with missing required fields', () => {
      const incompleteDto = {
        title: 'Valid title'
        // Missing content field
      };

      return request(app.getHttpServer())
        .post('/knowledge')
        .auth(jwtToken, { type: 'bearer' })
        .send(incompleteDto)
        .expect(400);
    });
  });

  describe('/knowledge (GET)', () => {
    it('should return paginated knowledge records', () => {
      return request(app.getHttpServer())
        .get('/knowledge?page=1&limit=10')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body.records).toBeInstanceOf(Array);
          expect(res.body.total).toBeDefined();
          expect(res.body.page).toEqual(1);
          expect(res.body.limit).toEqual(10);
          expect(typeof res.body.total).toBe('number');
          expect(res.body.records.length).toBeGreaterThan(0);
        });
    });

    it('should filter by category', () => {
      return request(app.getHttpServer())
        .get('/knowledge?category=technical')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body.records).toBeInstanceOf(Array);
          // All returned records should have technical category
          res.body.records.forEach((record: any) => {
            if (record.category) {
              expect(record.category).toBe('technical');
            }
          });
        });
    });

    it('should search by content', () => {
      const searchTerm = 'comprehensive';
      return request(app.getHttpServer())
        .get(`/knowledge?search=${searchTerm}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body.records).toBeInstanceOf(Array);
          // Should find our test record that contains 'comprehensive'
          const foundRecord = res.body.records.find((r: any) => 
            r.content.includes(searchTerm) || r.title.includes(searchTerm)
          );
          expect(foundRecord).toBeDefined();
        });
    });

    it('should handle custom pagination', () => {
      return request(app.getHttpServer())
        .get('/knowledge?page=2&limit=5')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body.page).toEqual(2);
          expect(res.body.limit).toEqual(5);
          expect(res.body.records.length).toBeLessThanOrEqual(5);
        });
    });

    it('should return 400 for invalid pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/knowledge?page=-1&limit=200')
        .auth(jwtToken, { type: 'bearer' })
        .expect(400);
    });

    it('should return 401 (Unauthorized) without token', () => {
      return request(app.getHttpServer())
        .get('/knowledge')
        .expect(401);
    });
  });

  describe('/knowledge/:id (GET)', () => {
    it('should return specific knowledge record', () => {
      return request(app.getHttpServer())
        .get(`/knowledge/${knowledgeId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body.id).toEqual(knowledgeId);
          expect(res.body.title).toBeDefined();
          expect(res.body.content).toBeDefined();
        });
    });

    it('should return 404 for non-existent knowledge record', () => {
      const fakeId = '12345678-1234-1234-1234-123456789012';
      return request(app.getHttpServer())
        .get(`/knowledge/${fakeId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });

    it('should return 400 for invalid UUID format', () => {
      const invalidId = 'invalid-uuid';
      return request(app.getHttpServer())
        .get(`/knowledge/${invalidId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(400);
    });
  });

  describe('/knowledge/:id (PATCH)', () => {
    it('should update knowledge record', () => {
      const updateDto = {
        title: 'Updated Test Knowledge',
        content: 'Updated comprehensive test content with more details',
        tags: ['test', 'updated', 'documentation']
      };

      return request(app.getHttpServer())
        .patch(`/knowledge/${knowledgeId}`)
        .auth(jwtToken, { type: 'bearer' })
        .send(updateDto)
        .expect(200)
        .then((res) => {
          expect(res.body.title).toEqual(updateDto.title);
          expect(res.body.content).toEqual(updateDto.content);
          expect(res.body.tags).toEqual(updateDto.tags);
          expect(res.body.updatedAt).toBeDefined();
        });
    });

    it('should update only specified fields', () => {
      const partialUpdate = {
        title: 'Partially Updated Title'
      };

      return request(app.getHttpServer())
        .patch(`/knowledge/${knowledgeId}`)
        .auth(jwtToken, { type: 'bearer' })
        .send(partialUpdate)
        .expect(200)
        .then((res) => {
          expect(res.body.title).toEqual(partialUpdate.title);
          // Content should remain unchanged
          expect(res.body.content).toEqual('Updated comprehensive test content with more details');
        });
    });

    it('should return 404 for non-existent knowledge record', () => {
      const fakeId = '12345678-1234-1234-1234-123456789012';
      const updateDto = { title: 'Updated Title' };

      return request(app.getHttpServer())
        .patch(`/knowledge/${fakeId}`)
        .auth(jwtToken, { type: 'bearer' })
        .send(updateDto)
        .expect(404);
    });

    it('should return 400 for invalid data', () => {
      const invalidUpdate = {
        title: '', // Empty title should fail validation
      };

      return request(app.getHttpServer())
        .patch(`/knowledge/${knowledgeId}`)
        .auth(jwtToken, { type: 'bearer' })
        .send(invalidUpdate)
        .expect(400);
    });
  });

  describe('/knowledge/:id/rate (POST)', () => {
    it('should rate knowledge record', () => {
      const ratingDto = { rating: 4 };

      return request(app.getHttpServer())
        .post(`/knowledge/${knowledgeId}/rate`)
        .auth(jwtToken, { type: 'bearer' })
        .send(ratingDto)
        .expect(201)
        .then((res) => {
          expect(res.body.rating).toBeGreaterThan(0);
          expect(res.body.ratingCount).toEqual(1);
        });
    });

    it('should update average rating with multiple ratings', () => {
      const ratingDto = { rating: 5 };

      return request(app.getHttpServer())
        .post(`/knowledge/${knowledgeId}/rate`)
        .auth(jwtToken, { type: 'bearer' })
        .send(ratingDto)
        .expect(201)
        .then((res) => {
          expect(res.body.rating).toBeCloseTo(4.5, 1); // (4 + 5) / 2 = 4.5
          expect(res.body.ratingCount).toEqual(2);
        });
    });

    it('should return 400 for invalid rating (too high)', () => {
      const invalidRating = { rating: 6 };

      return request(app.getHttpServer())
        .post(`/knowledge/${knowledgeId}/rate`)
        .auth(jwtToken, { type: 'bearer' })
        .send(invalidRating)
        .expect(400);
    });

    it('should return 400 for invalid rating (too low)', () => {
      const invalidRating = { rating: 0 };

      return request(app.getHttpServer())
        .post(`/knowledge/${knowledgeId}/rate`)
        .auth(jwtToken, { type: 'bearer' })
        .send(invalidRating)
        .expect(400);
    });

    it('should return 404 for non-existent knowledge record', () => {
      const fakeId = '12345678-1234-1234-1234-123456789012';
      const ratingDto = { rating: 4 };

      return request(app.getHttpServer())
        .post(`/knowledge/${fakeId}/rate`)
        .auth(jwtToken, { type: 'bearer' })
        .send(ratingDto)
        .expect(404);
    });
  });

  describe('/knowledge/search (GET)', () => {
    beforeAll(async () => {
      // Create knowledge records with specific tags for search testing
      const taggedKnowledge = [
        {
          title: 'JavaScript Guide',
          content: 'Complete JavaScript programming guide',
          tags: ['javascript', 'programming', 'web']
        },
        {
          title: 'React Tutorial',
          content: 'Learn React from basics to advanced',
          tags: ['react', 'javascript', 'frontend']
        },
        {
          title: 'Node.js Backend',
          content: 'Building backend services with Node.js',
          tags: ['nodejs', 'backend', 'javascript']
        }
      ];

      for (const knowledge of taggedKnowledge) {
        await request(app.getHttpServer())
          .post('/knowledge')
          .auth(jwtToken, { type: 'bearer' })
          .send(knowledge);
      }
    });

    it('should search by single tag', () => {
      return request(app.getHttpServer())
        .get('/knowledge/search?tags=javascript')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeGreaterThan(0);
          // All results should contain the 'javascript' tag
          res.body.forEach((record: any) => {
            expect(record.tags).toContain('javascript');
          });
        });
    });

    it('should search by multiple tags', () => {
      return request(app.getHttpServer())
        .get('/knowledge/search?tags=javascript,frontend')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          // Should find records that contain either tag
          const hasJavaScript = res.body.some((r: any) => r.tags.includes('javascript'));
          const hasFrontend = res.body.some((r: any) => r.tags.includes('frontend'));
          expect(hasJavaScript || hasFrontend).toBe(true);
        });
    });

    it('should return empty array for non-existent tags', () => {
      return request(app.getHttpServer())
        .get('/knowledge/search?tags=nonexistenttag')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toEqual(0);
        });
    });

    it('should handle empty tags parameter', () => {
      return request(app.getHttpServer())
        .get('/knowledge/search?tags=')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
        });
    });
  });

  describe('/knowledge/popular (GET)', () => {
    it('should return popular knowledge records', () => {
      return request(app.getHttpServer())
        .get('/knowledge/popular?limit=5')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeLessThanOrEqual(5);
          // Should be sorted by rating and use count
          if (res.body.length > 1) {
            for (let i = 1; i < res.body.length; i++) {
              const prev = res.body[i - 1];
              const curr = res.body[i];
              // Previous item should have higher or equal rating
              expect(prev.rating).toBeGreaterThanOrEqual(curr.rating);
            }
          }
        });
    });

    it('should use default limit when not specified', () => {
      return request(app.getHttpServer())
        .get('/knowledge/popular')
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body.length).toBeLessThanOrEqual(10); // Default limit
        });
    });
  });

  describe('/knowledge/:id (DELETE)', () => {
    let knowledgeToDelete: string;

    beforeAll(async () => {
      // Create a knowledge record specifically for deletion testing
      const response = await request(app.getHttpServer())
        .post('/knowledge')
        .auth(jwtToken, { type: 'bearer' })
        .send({
          title: 'Knowledge to Delete',
          content: 'This knowledge will be deleted in tests'
        });
      knowledgeToDelete = response.body.id;
    });

    it('should delete knowledge record', () => {
      return request(app.getHttpServer())
        .delete(`/knowledge/${knowledgeToDelete}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(200)
        .then((res) => {
          expect(res.body.deleted).toBe(true);
          expect(res.body.id).toEqual(knowledgeToDelete);
        });
    });

    it('should return 404 when trying to access deleted knowledge', () => {
      return request(app.getHttpServer())
        .get(`/knowledge/${knowledgeToDelete}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });

    it('should return 404 for non-existent knowledge record', () => {
      const fakeId = '12345678-1234-1234-1234-123456789012';
      return request(app.getHttpServer())
        .delete(`/knowledge/${fakeId}`)
        .auth(jwtToken, { type: 'bearer' })
        .expect(404);
    });
  });

  describe('Edge Cases and Security', () => {
    it('should not allow access to other users knowledge', async () => {
      // Create another user
      const otherUser = {
        email: 'other-knowledge-user@example.com',
        password: 'password123',
      };
      
      await request(app.getHttpServer()).post('/auth/signup').send(otherUser);
      const otherLoginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(otherUser);
      const otherUserToken = otherLoginResponse.body.token;

      // Try to access the original user's knowledge with the other user's token
      return request(app.getHttpServer())
        .get(`/knowledge/${knowledgeId}`)
        .auth(otherUserToken, { type: 'bearer' })
        .expect(404); // Should not find it as it belongs to different user
    });

    it('should handle malformed JSON in request body', () => {
      return request(app.getHttpServer())
        .post('/knowledge')
        .auth(jwtToken, { type: 'bearer' })
        .send('{ invalid json }')
        .expect(400);
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000); // Very long content
      const knowledgeDto = {
        title: 'Long Content Test',
        content: longContent
      };

      return request(app.getHttpServer())
        .post('/knowledge')
        .auth(jwtToken, { type: 'bearer' })
        .send(knowledgeDto)
        .expect(201)
        .then((res) => {
          expect(res.body.content.length).toEqual(10000);
        });
    });

    it('should handle special characters in tags', () => {
      const knowledgeDto = {
        title: 'Special Characters Test',
        content: 'Testing special characters in tags',
        tags: ['tag-with-dash', 'tag_with_underscore', 'tag.with.dots']
      };

      return request(app.getHttpServer())
        .post('/knowledge')
        .auth(jwtToken, { type: 'bearer' })
        .send(knowledgeDto)
        .expect(201)
        .then((res) => {
          expect(res.body.tags).toEqual(knowledgeDto.tags);
        });
    });
  });
});