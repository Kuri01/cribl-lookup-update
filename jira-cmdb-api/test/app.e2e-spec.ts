import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const insightPayload = {
    values: [
      {
        id: '456',
        label: 'SRV-123',
        objectKey: 'ITSM-456',
      },
    ],
  };

  beforeEach(async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('/insight/objects')) {
        return new Response(JSON.stringify(insightPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Unexpected URL in test', url }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  it('/insight/objects (GET)', () => {
    return request(app.getHttpServer())
      .get('/insight/objects')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('values');
        expect(Array.isArray(res.body.values)).toBe(true);
      });
  });

  it('/cribl/lookups/update (POST) dry run', () => {
    return request(app.getHttpServer())
      .post('/cribl/lookups/update')
      .send({ dryRun: true })
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('dryRun', true);
        expect(res.body).toHaveProperty('uploadUrl');
        expect(res.body).toHaveProperty('patchUrl');
      });
  });
});
