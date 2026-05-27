/**
 * System-level validation (Step 8 — Testing & Validation / system testing):
 * end-to-end trace through core use cases in one coherent workflow.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('System testing — use case trace (e2e)', () => {
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
  }, 90000);

  afterAll(async () => {
    await app.close();
  });

  it('UC chain: authenticate → create user → report issue → assign → update status → resolve → close → reports', async () => {
    const suffix = Date.now();

    const tech = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Field Tech',
        email: `sys.tech.${suffix}@test.local`,
        phone: '0991111222',
        role: 'technician',
        password: 'techsys123',
      })
      .expect(201);

    const intakeUser = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'CS Intake',
        email: `sys.intake.${suffix}@test.local`,
        phone: '0991111333',
        role: 'intake_officer',
        password: 'intakesys1',
      })
      .expect(201);

    const offLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: intakeUser.body.email,
        password: 'intakesys1',
      })
      .expect(201);

    const issue = await request(app.getHttpServer())
      .post('/issue')
      .set('Authorization', `Bearer ${offLogin.body.accessToken}`)
      .send({
        description: 'System test pipeline',
        severityLevel: 'high',
        reportChannel: 'walk-in',
        dateReported: '2026-03-28T08:00:00.000Z',
        reporterName: 'Public',
        reporterPhone: '1',
        location: {
          latitude: -13.95,
          longitude: 33.79,
          addressDescription: 'Test corridor',
          serviceArea: 'Zone-A',
        },
      })
      .expect(201);

    expect(issue.body.currentStatus.name).toBe('reported');

    await request(app.getHttpServer())
      .post('/assignment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        issueId: issue.body.id,
        assignedToUserId: tech.body.id,
        priorityLevel: 'high',
      })
      .expect(201);

    const techLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: tech.body.email,
        password: 'techsys123',
      })
      .expect(201);
    const techToken = techLogin.body.accessToken as string;

    await request(app.getHttpServer())
      .patch(`/issue/${issue.body.id}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'in_progress' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/issue/${issue.body.id}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        status: 'resolved',
        resolutionDetails: 'System validation repair completed.',
      })
      .expect(200);

    const closed = await request(app.getHttpServer())
      .post(`/issue/${issue.body.id}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(closed.body.currentStatus.name).toBe('closed');

    await request(app.getHttpServer())
      .get('/report/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/report/resolution-stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
