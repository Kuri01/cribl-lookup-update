import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
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
