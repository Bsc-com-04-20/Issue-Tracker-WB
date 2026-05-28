import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Increment 2 — assignment (e2e)', () => {
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

  it('assigns reported issue to technician; status becomes assigned; technician sees mine', async () => {
    const techRes = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tech One',
        email: `tech.increment2.${Date.now()}@test.local`,
        phone: '0990000001',
        role: 'technician',
        password: 'techpass123',
      })
      .expect(201);

    const technicianId = techRes.body.id as number;

    const issueRes = await request(app.getHttpServer())
      .post('/issue')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Leak for assignment test',
        severityLevel: 'medium',
        issueCategory: 'water_supply',
        reportChannel: 'phone',
        dateReported: '2026-03-28T12:00:00.000Z',
        reporterName: 'Reporter',
        reporterPhone: '+265991000001',
        location: {
          latitude: -13.9,
          longitude: 33.7,
          addressDescription: 'Test site',
        },
      })
      .expect(201);

    const issueId = issueRes.body.id as number;
    expect(issueRes.body.currentStatus.name).toBe('reported');

    const assignRes = await request(app.getHttpServer())
      .post('/assignment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        issueId,
        assignedToUserId: technicianId,
        priorityLevel: 'high',
      })
      .expect(201);

    expect(assignRes.body.priorityLevel).toBe('high');
    expect(assignRes.body.assignedTo.id).toBe(technicianId);
    expect(assignRes.body.issue.currentStatus.name).toBe('assigned');

    const techLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: techRes.body.email,
        password: 'techpass123',
      })
      .expect(201);

    const mine = await request(app.getHttpServer())
      .get('/assignment/mine')
      .set('Authorization', `Bearer ${techLogin.body.accessToken}`)
      .expect(200);

    expect(Array.isArray(mine.body)).toBe(true);
    expect(mine.body.length).toBeGreaterThanOrEqual(1);
    const match = mine.body.find((a: { issue?: { id?: number } }) => a.issue?.id === issueId);
    expect(match).toBeDefined();
  });

  it('intake_officer can assign reported issue to technician', async () => {
    const intakeRes = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Intake Assign',
        email: `intake.inc2.${Date.now()}@test.local`,
        phone: '0990000002',
        role: 'intake_officer',
        password: 'intakepass123',
      })
      .expect(201);

    const techRes = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tech For Intake',
        email: `tech.intake.${Date.now()}@test.local`,
        phone: '0990000005',
        role: 'technician',
        password: 'techintake1',
      })
      .expect(201);

    const offLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: intakeRes.body.email,
        password: 'intakepass123',
      })
      .expect(201);

    const issueRes = await request(app.getHttpServer())
      .post('/issue')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Issue for intake assignment',
        severityLevel: 'low',
        issueCategory: 'water_supply',
        reportChannel: 'walk-in',
        dateReported: '2026-03-28T14:00:00.000Z',
        reporterName: 'R',
        reporterPhone: '+265991000002',
        location: {
          latitude: -13.91,
          longitude: 33.71,
          addressDescription: 'RBAC',
        },
      })
      .expect(201);

    const assignRes = await request(app.getHttpServer())
      .post('/assignment')
      .set('Authorization', `Bearer ${offLogin.body.accessToken}`)
      .send({
        issueId: issueRes.body.id,
        assignedToUserId: techRes.body.id,
        priorityLevel: 'low',
      })
      .expect(201);

    expect(assignRes.body.assignedTo.id).toBe(techRes.body.id);
    expect(assignRes.body.issue.currentStatus.name).toBe('assigned');
  });

  it('cannot assign to non-technician (400)', async () => {
    const citizenRes = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Citizen Three',
        email: `citizen.inc2b.${Date.now()}@test.local`,
        phone: '0990000003',
        role: 'citizen',
        password: 'citizenpass456',
      })
      .expect(201);

    const issueRes = await request(app.getHttpServer())
      .post('/issue')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Issue assign to non-technician should fail',
        severityLevel: 'low',
        issueCategory: 'water_supply',
        reportChannel: 'phone',
        dateReported: '2026-03-28T15:00:00.000Z',
        reporterName: 'R',
        reporterPhone: '+265991000003',
        location: {
          latitude: -13.92,
          longitude: 33.72,
          addressDescription: 'X',
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/assignment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        issueId: issueRes.body.id,
        assignedToUserId: citizenRes.body.id,
        priorityLevel: 'medium',
      })
      .expect(400);
  });

  it('cannot assign same issue twice (400)', async () => {
    const techRes = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tech Double',
        email: `tech.double.${Date.now()}@test.local`,
        phone: '0990000004',
        role: 'technician',
        password: 'techpass999',
      })
      .expect(201);

    const issueRes = await request(app.getHttpServer())
      .post('/issue')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Double assign test',
        severityLevel: 'low',
        issueCategory: 'water_supply',
        reportChannel: 'phone',
        dateReported: '2026-03-28T16:00:00.000Z',
        reporterName: 'R',
        reporterPhone: '+265991000004',
        location: {
          latitude: -13.93,
          longitude: 33.73,
          addressDescription: 'Y',
        },
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/assignment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        issueId: issueRes.body.id,
        assignedToUserId: techRes.body.id,
        priorityLevel: 'high',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/assignment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        issueId: issueRes.body.id,
        assignedToUserId: techRes.body.id,
        priorityLevel: 'low',
      })
      .expect(400);
  });
});
