import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Increment 4 — reports (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    await request(app.getHttpServer()).post('/user/bootstrap-admin');

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@local.dev', password: 'admin123' });
    adminToken = login.body.accessToken as string;
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('GET /report/summary returns aggregates', async () => {
    const res = await request(app.getHttpServer())
      .get('/report/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('totals');
    expect(res.body.totals).toHaveProperty('issues');
    expect(res.body).toHaveProperty('byStatus');
    expect(res.body).toHaveProperty('bySeverity');
    expect(res.body).toHaveProperty('byReportChannel');
    expect(res.body).toHaveProperty('byServiceArea');
  });

  it('GET /report/resolution-stats returns metrics', async () => {
    const res = await request(app.getHttpServer())
      .get('/report/resolution-stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('resolvedCount');
    expect(res.body).toHaveProperty('avgHoursReportedToResolved');
  });

  it('GET /report/issues-by-month returns trend array', async () => {
    const res = await request(app.getHttpServer())
      .get('/report/issues-by-month')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('issuesByMonth');
    expect(Array.isArray(res.body.issuesByMonth)).toBe(true);
  });

  it('intake_officer cannot access full reports summary (403)', async () => {
    const intakeUser = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Intake Report',
        email: `intake.rep.${Date.now()}@test.local`,
        phone: '0660000001',
        role: 'intake_officer',
        password: 'intakerep1',
      })
      .expect(201);

    const offLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: intakeUser.body.email,
        password: 'intakerep1',
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/report/summary')
      .set('Authorization', `Bearer ${offLogin.body.accessToken}`)
      .expect(403);
  });

  it('intake_officer can read operational pulse (200)', async () => {
    const intakeUser = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Intake Pulse',
        email: `intake.pulse.${Date.now()}@test.local`,
        phone: '0660000002',
        role: 'intake_officer',
        password: 'intakepulse1',
      })
      .expect(201);

    const offLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: intakeUser.body.email,
        password: 'intakepulse1',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/report/operational-pulse')
      .set('Authorization', `Bearer ${offLogin.body.accessToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('openIssuesPastResolutionDueNotStamped');
  });
});
