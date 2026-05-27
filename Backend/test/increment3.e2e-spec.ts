import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

async function createTechAndAssignedIssue(
  app: INestApplication<App>,
  adminToken: string,
  suffix: string,
) {
  const techRes = await request(app.getHttpServer())
    .post('/user')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: `Tech ${suffix}`,
      email: `tech.inc3.${suffix}.${Date.now()}@test.local`,
      phone: '0880000001',
      role: 'technician',
      password: 'techpassinc3',
    })
    .expect(201);

  const issueRes = await request(app.getHttpServer())
    .post('/issue')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      description: `Issue ${suffix}`,
      severityLevel: 'medium',
      issueCategory: 'water_supply',
      reportChannel: 'phone',
      dateReported: '2026-03-28T12:00:00.000Z',
      reporterName: 'R',
      reporterPhone: `+26599${String(Date.now() % 10000000).padStart(7, '0')}`,
      location: {
        latitude: -13.9,
        longitude: 33.7,
        addressDescription: 'Site',
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

  const techLogin = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      email: techRes.body.email,
      password: 'techpassinc3',
    })
    .expect(201);

  return {
    issueId: issueRes.body.id as number,
    techToken: techLogin.body.accessToken as string,
    techEmail: techRes.body.email as string,
  };
}

describe('Increment 3 — status & resolution (e2e)', () => {
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

  it('happy path: in_progress → resolved (with resolution) → closed', async () => {
    const { issueId, techToken } = await createTechAndAssignedIssue(
      app,
      adminToken,
      'happy',
    );

    await request(app.getHttpServer())
      .patch(`/issue/${issueId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'in_progress' })
      .expect(200);

    const resolved = await request(app.getHttpServer())
      .patch(`/issue/${issueId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        status: 'resolved',
        resolutionDetails: 'Fixed leak; tested OK.',
      })
      .expect(200);

    expect(resolved.body.currentStatus.name).toBe('resolved');
    expect(resolved.body.resolution).toBeDefined();
    expect(resolved.body.resolution.resolutionDetails).toBe(
      'Fixed leak; tested OK.',
    );

    const closed = await request(app.getHttpServer())
      .post(`/issue/${issueId}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    expect(closed.body.currentStatus.name).toBe('closed');
  });

  it('cannot skip to resolved from assigned (doc: invalid transition)', async () => {
    const { issueId, techToken } = await createTechAndAssignedIssue(
      app,
      adminToken,
      'skip',
    );

    await request(app.getHttpServer())
      .patch(`/issue/${issueId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        status: 'resolved',
        resolutionDetails: 'Should fail',
      })
      .expect(400);
  });

  it('technician cannot close issue (403)', async () => {
    const { issueId, techToken } = await createTechAndAssignedIssue(
      app,
      adminToken,
      'close403',
    );

    await request(app.getHttpServer())
      .patch(`/issue/${issueId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ status: 'in_progress' })
      .expect(200);

    await request(app.getHttpServer())
      .patch(`/issue/${issueId}/status`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({
        status: 'resolved',
        resolutionDetails: 'Done',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/issue/${issueId}/close`)
      .set('Authorization', `Bearer ${techToken}`)
      .expect(403);
  });

  it('GET /issue/:id allowed for assigned technician', async () => {
    const { issueId, techToken } = await createTechAndAssignedIssue(
      app,
      adminToken,
      'getone',
    );

    const res = await request(app.getHttpServer())
      .get(`/issue/${issueId}`)
      .set('Authorization', `Bearer ${techToken}`)
      .expect(200);

    expect(res.body.id).toBe(issueId);
  });

  it('intake_officer can list issues (GET /issue)', async () => {
    const intakeUser = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Officer List',
        email: `intake_officer.list.${Date.now()}@test.local`,
        phone: '0770000001',
        role: 'intake_officer',
        password: 'intake_officerlist1',
      })
      .expect(201);

    const offLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: intakeUser.body.email,
        password: 'intake_officerlist1',
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/issue')
      .set('Authorization', `Bearer ${offLogin.body.accessToken}`)
      .expect(200);

    expect(Array.isArray(list.body.items)).toBe(true);
  });

  it('intake_officer classification omits fraud investigation category', async () => {
    const intakeUser = await request(app.getHttpServer())
      .post('/user')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Officer Classify',
        email: `intake_officer.cls.${Date.now()}@test.local`,
        phone: '0770000002',
        role: 'intake_officer',
        password: 'intake_cls1',
      })
      .expect(201);

    const offLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: intakeUser.body.email,
        password: 'intake_cls1',
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/issue/classification')
      .set('Authorization', `Bearer ${offLogin.body.accessToken}`)
      .expect(200);

    expect(res.body.categories).toBeDefined();
    expect(res.body.categories.illegal_connection_fraud).toBeUndefined();
  });

  it('GET /issue accepts needsDuplicateReview; refresh-intelligence rescans duplicates', async () => {
    const sharedPhone = `+26599${String(Date.now() % 10000000).padStart(7, '0')}`;
    const tOlder = new Date(Date.now() - 36 * 3600000).toISOString();
    const tNewer = new Date(Date.now() - 2 * 3600000).toISOString();
    const locA = {
      latitude: -15.784,
      longitude: 35.0085,
      addressDescription: 'Dup test A',
    };
    const locB = {
      latitude: -15.7845,
      longitude: 35.0088,
      addressDescription: 'Dup test B',
    };

    await request(app.getHttpServer())
      .post('/issue')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Dup seed A',
        severityLevel: 'medium',
        issueCategory: 'water_supply',
        reportChannel: 'phone',
        dateReported: tOlder,
        reporterName: 'Dup',
        reporterPhone: sharedPhone,
        location: locA,
      })
      .expect(201);

    const b = await request(app.getHttpServer())
      .post('/issue')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Dup seed B',
        severityLevel: 'medium',
        issueCategory: 'water_supply',
        reportChannel: 'phone',
        dateReported: tNewer,
        reporterName: 'Dup',
        reporterPhone: sharedPhone,
        location: locB,
      })
      .expect(201);

    const dupId = b.body.id as number;
    const detail = await request(app.getHttpServer())
      .get(`/issue/${dupId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const cnt = Number(
      detail.body.issueAttributes?.intake_duplicate_candidate_count ?? 0,
    );
    expect(cnt).toBeGreaterThan(0);

    const filt = await request(app.getHttpServer())
      .get('/issue?needsDuplicateReview=true&status=reported&skip=0&take=50')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      filt.body.items.some((x: { id: number }) => x.id === dupId),
    ).toBe(true);

    const refreshed = await request(app.getHttpServer())
      .post(`/issue/${dupId}/refresh-intelligence`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(refreshed.body.intakeIntelligence).toBeDefined();
    expect(
      Number(refreshed.body.intakeIntelligence.duplicateCandidateCount),
    ).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .patch(`/issue/${dupId}/reporter-context`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reporterPhone: sharedPhone })
      .expect(200);
  });
});
