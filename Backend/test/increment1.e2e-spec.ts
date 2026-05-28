import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

/**
 * Increment 1 (documentation alignment):
 * - Staff-created reports, geo data, structured capture, auth, RBAC, audit + status history.
 * Requires MySQL matching .env and DB_SYNC enabled (or schema present).
 */
describe('Increment 1 — issue reporting (e2e)', () => {
  let app: INestApplication<App>;

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
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  it('GET / returns welcome', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('POST /user/bootstrap-admin ensures admin exists', async () => {
    const res = await request(app.getHttpServer())
      .post('/user/bootstrap-admin')
      .expect(201);

    expect(res.body).toMatchObject({
      email: 'admin@local.dev',
      role: 'admin',
    });
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('POST /auth/login returns JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@local.dev', password: 'admin123' })
      .expect(201);

    expect(res.body.accessToken).toBeDefined();
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.refreshToken).toBeDefined();
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.user).toMatchObject({
      email: 'admin@local.dev',
      role: 'admin',
    });
  });

  it('POST /issue without token → 401', () => {
    return request(app.getHttpServer())
      .post('/issue')
      .send({
        description: 'Test',
        severityLevel: 'low',
        reportChannel: 'phone',
        dateReported: '2026-03-28T10:00:00.000Z',
        reporterName: 'A',
        reporterPhone: '0',
        location: {
          latitude: -13.96,
          longitude: 33.78,
          addressDescription: 'X',
        },
      })
      .expect(401);
  });

  it('POST /issue with valid data → 201 and reported status (doc test case)', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@local.dev', password: 'admin123' });

    const token = login.body.accessToken as string;

    const res = await request(app.getHttpServer())
      .post('/issue')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Pipe burst at Area 25',
        severityLevel: 'high',
        reportChannel: 'phone',
        dateReported: '2026-03-20T12:00:00.000Z',
        reporterName: 'Citizen',
        reporterPhone: '+265990000000',
        reporterAffiliation: 'Area 25',
        location: {
          latitude: -13.96,
          longitude: 33.78,
          addressDescription: 'Near junction',
          serviceArea: 'Lilongwe',
        },
      })
      .expect(201);

    expect(res.body.id).toBeDefined();
    expect(res.body.description).toBe('Pipe burst at Area 25');
    expect(res.body.currentStatus).toBeDefined();
    expect(res.body.currentStatus.name).toBe('reported');
    expect(Number(res.body.location.latitude)).toBeCloseTo(-13.96, 5);
    expect(Number(res.body.location.longitude)).toBeCloseTo(33.78, 5);
    expect(res.body.createdBy).toMatchObject({ email: 'admin@local.dev' });
  });

  it('POST /issue missing location → 400 (doc validation case)', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@local.dev', password: 'admin123' });

    await request(app.getHttpServer())
      .post('/issue')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({
        description: 'Water leakage',
        severityLevel: 'medium',
        reportChannel: 'walk-in',
        dateReported: '2026-03-28T10:00:00.000Z',
        reporterName: 'B',
        reporterPhone: '1',
      })
      .expect(400);
  });
});
