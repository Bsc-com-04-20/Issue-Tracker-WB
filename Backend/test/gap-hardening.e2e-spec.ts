import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Gap hardening (e2e)', () => {
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

  it('GET /audit returns paginated items (admin)', async () => {
    const res = await request(app.getHttpServer())
      .get('/audit?skip=0&take=10')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body).toHaveProperty('items');
    expect(res.body).toHaveProperty('total');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('GET /user lists users (admin)', async () => {
    const res = await request(app.getHttpServer())
      .get('/user?take=5')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0]).not.toHaveProperty('passwordHash');
  });

  it('disabled user cannot login after password matches', async () => {
    const create = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Inactive User',
        email: `inactive.${Date.now()}@test.local`,
        phone: '0880000999',
        role: 'intake_officer',
        password: 'longpass123',
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch(`/user/${create.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false })
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: create.body.email,
        password: 'longpass123',
      })
      .expect(401);
  });

  it('reassigns assigned issue to another technician', async () => {
    const t1 = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tech R1',
        email: `tech.r1.${Date.now()}@test.local`,
        phone: '0771111001',
        role: 'technician',
        password: 't1pass12345',
      })
      .expect(201);

    const t2 = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Tech R2',
        email: `tech.r2.${Date.now()}@test.local`,
        phone: '0771111002',
        role: 'technician',
        password: 't2pass12345',
      })
      .expect(201);

    const issueRes = await request(app.getHttpServer())
      .post('/issue')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Reassign flow',
        severityLevel: 'low',
        reportChannel: 'phone',
        dateReported: '2026-03-28T18:00:00.000Z',
        reporterName: 'R',
        reporterPhone: '09999111',
        location: {
          latitude: -13.95,
          longitude: 33.75,
          addressDescription: 'Reassign site',
        },
      })
      .expect(201);

    const issueId = issueRes.body.id as number;

    await request(app.getHttpServer())
      .post('/assignment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        issueId,
        assignedToUserId: t1.body.id,
        priorityLevel: 'high',
      })
      .expect(201);

    const re = await request(app.getHttpServer())
      .post('/assignment')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        issueId,
        assignedToUserId: t2.body.id,
        priorityLevel: 'medium',
      })
      .expect(201);

    expect(re.body.assignedTo.id).toBe(t2.body.id);

    const t2Login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: t2.body.email, password: 't2pass12345' })
      .expect(201);

    const mine = await request(app.getHttpServer())
      .get('/assignment/mine')
      .set('Authorization', `Bearer ${t2Login.body.accessToken}`)
      .expect(200);

    const hit = mine.body.find(
      (a: { issue?: { id?: number } }) => a.issue?.id === issueId,
    );
    expect(hit).toBeDefined();
  });

  it('GET /issue/possible-duplicates by phone returns array', async () => {
    await request(app.getHttpServer())
      .post('/issue')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Dup hint A',
        severityLevel: 'low',
        reportChannel: 'phone',
        dateReported: '2026-03-28T19:00:00.000Z',
        reporterName: 'R',
        reporterPhone: '0555000111',
        location: {
          latitude: -14.0,
          longitude: 33.8,
          addressDescription: 'Dup A',
        },
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/issue/possible-duplicates?reporterPhone=0555000111&days=30')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});
