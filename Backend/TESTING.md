# Testing & validation (implementation plan — Step 8, phase *Testing and validation*)

This project maps your documented levels to concrete commands.

## 1. Unit testing

**Goal:** Verify isolated rules and services (validation, auth, status rules).

**Command:**

```bash
npm test
```

**Scope:** `src/**/*.spec.ts` (Jest `rootDir`: `src`).

**Examples:**

- `issue-status.rules.spec.ts` — technician status transitions and close-from-resolved rules (aligns with documented invalid transition cases).
- `auth.service.spec.ts` — credential checks and JWT payload shape.

## 2. Integration testing

**Goal:** Verify HTTP + Nest modules + MySQL + TypeORM together (no browser).

**Command:**

```bash
npm run test:e2e
```

**Scope:** `test/**/*.e2e-spec.ts` using `AppModule` and `supertest`.

**Focused suites (per increment):**

```bash
npm run test:e2e:increment1
npm run test:e2e:increment2
npm run test:e2e:increment3
npm run test:e2e:increment4
```

## 3. System testing

**Goal:** One end-to-end path through the main use cases (report → assign → work → resolve → close → reports).

**Command:**

```bash
npm run test:system
```

**Spec:** `test/system.use-cases.e2e-spec.ts`

## 4. Full validation gate (build + unit + integration/system)

**Command:**

```bash
npm run test:validation
```

Runs `build`, unit tests, and the full e2e suite (all increment specs and any other `*.e2e-spec.ts`).

**Lint (optional strict check without auto-fix):**

```bash
npm run lint:check
```

## Prerequisites

- MySQL running with database and credentials from `.env`.
- `DB_SYNC=true` acceptable for development testing (use migrations for production).

## Traceability (use cases ↔ tests)

| Use case (from your spec) | Where it is covered |
|---------------------------|---------------------|
| Authenticate user | `auth.service.spec.ts`, all e2e `beforeAll` logins |
| Submit issue report | `increment1.e2e-spec.ts`, `system.use-cases.e2e-spec.ts` |
| Assign issue | `increment2.e2e-spec.ts`, `system.use-cases.e2e-spec.ts` |
| Update issue status / resolution | `increment3.e2e-spec.ts`, `issue-status.rules.spec.ts`, `system.use-cases.e2e-spec.ts` |
| Close issue | `increment3.e2e-spec.ts`, `system.use-cases.e2e-spec.ts` |
| Generate reports | `increment4.e2e-spec.ts`, `system.use-cases.e2e-spec.ts` |
| RBAC / unauthorized paths | increment e2e specs (403/401 cases) |

## Non-functional checks (manual)

- **Security:** Role guards on restricted routes (Swagger + negative tests).
- **Performance:** Basic check under normal dev load (optional: document response times during demo).
- **Data integrity:** Foreign keys and transactions on assign/status/close (observed via SQL logs when `logging: true`).

## 5. Manual verification with Swagger (use-case walkthrough)

**Prerequisites:** `npm run start:dev`, MySQL running, `.env` configured. If Swagger does not load, set `SWAGGER_ENABLED=true` (or avoid `NODE_ENV=production` without that flag).

**Open UI:** `http://localhost:3000/api` (or your `PORT`).

**Tip:** After each login, copy `accessToken` from the response. Click **Authorize** (lock icon), paste `Bearer <accessToken>` or just the token (Swagger adds `Bearer` if configured), then **Authorize** → **Close**. Use **Try it out** on each operation.

### Step 0 — API up

| Action | Endpoint (tag) | Expected |
|--------|----------------|----------|
| Optional | `GET /` (app) | `Hello World!` |
| Optional | `GET /health/live` (health) | `{ "status": "ok", ... }` |
| Optional | `GET /health` (health) | `200` with DB latency, or `503` if DB down |

### Step 1 — Bootstrap admin (first-time / dev)

| Use case trace | Endpoint | Body / notes |
|----------------|----------|--------------|
| Initial admin | `POST /user/bootstrap-admin` (users) | Empty body. **201** with admin user (no `passwordHash`). Default login: `admin@local.dev` / `admin123`. |

### Step 2 — Authenticate

| Use case trace | Endpoint | Body | Expected |
|----------------|----------|------|----------|
| Authenticate user | `POST /auth/login` (auth) | `{ "email": "admin@local.dev", "password": "admin123" }` | **201** with `accessToken`, `refreshToken`, `expiresIn`, `user`. Authorize with `accessToken`. |
| Refresh (optional) | `POST /auth/refresh` | `{ "refreshToken": "<paste>" }` | New `accessToken`; re-Authorize if you switched tokens. |
| Logout refresh (optional) | `POST /auth/logout` | `{ "refreshToken": "<paste>" }` | **201** `{ "ok": true }`. |

### Step 3 — User administration (admin)

| Use case trace | Endpoint | Notes |
|----------------|----------|--------|
| List users | `GET /user` | **200** `{ items, total, skip, take }`. |
| Get user | `GET /user/{id}` | Use an `id` from the list. |
| Create staff user | `POST /user` | Example: officer or technician JSON from Swagger schema. **201** safe user object. |
| Update user | `PATCH /user/{id}` | e.g. `{ "department": "Field Ops" }`. |
| Admin password reset | `PATCH /user/{id}/password` | `{ "newPassword": "..." }` (min 6 chars). |

### Step 4 — Submit issue report (officer / supervisor / admin)

| Use case trace | Endpoint | Notes |
|----------------|----------|--------|
| Submit issue report | `POST /issue` (issues) | Full `CreateIssueDto` + nested `location`. Optional `reporterEmail` for mail notifications if SMTP is configured. **201**, `currentStatus.name` = `reported`. |
| Duplicate hints | `GET /issue/possible-duplicates` | Query: `reporterPhone` and/or `latitude`+`longitude`, optional `days`. **200** array. |
| Paginated monitor list | `GET /issue` | Query: `skip`, `take`, optional `status`. **200** `{ items, total, skip, take }`. |

### Step 5 — Assign issue (admin / supervisor)

| Use case trace | Endpoint | Body |
|----------------|----------|------|
| Assign issue | `POST /assignment` (assignments) | `{ "issueId": <id>, "assignedToUserId": <technicianUserId>, "priorityLevel": "high" }`. **201**; issue status becomes `assigned`. |
| Reassign (optional) | Same | Call again with another technician while status is `assigned`. **201**; audit `reassign_issue`. |
| List technicians (picker) | `GET /user/technicians` | **Admin** or **supervisor**. **200** array of `{ id, name, email }` for active technicians (assignment UI). |
| Technician: my assignments | `GET /assignment/mine` | Log in as **technician**, Authorize, then call. **200** array. |

### Step 6 — Technician workflow

| Use case trace | Endpoint | Body |
|----------------|----------|------|
| View issue (technician) | `GET /issue/{id}` | Only if this technician is the **latest** assignee. **200** or **403**. |
| Update status → in progress | `PATCH /issue/{id}/status` | `{ "status": "in_progress" }` |
| Update status → resolved | `PATCH /issue/{id}/status` | `{ "status": "resolved", "resolutionDetails": "..." }` |
| List / upload attachments (optional) | `GET /issue/{id}/attachments`, `POST /issue/{id}/attachments` | Upload: form field **`file`** (JPEG/PNG/WebP/PDF). Download: `GET /issue/file/{attachmentId}/download`. |

### Step 7 — Close issue (admin / supervisor)

| Use case trace | Endpoint | Notes |
|----------------|----------|--------|
| Close issue | `POST /issue/{id}/close` | Only from **resolved**. **201**, `currentStatus.name` = `closed`. |

### Step 8 — Reports (admin / supervisor)

| Use case trace | Endpoint | Notes |
|----------------|----------|--------|
| Summary | `GET /report/summary` | Optional date query params per DTO. **200**. |
| Resolution stats | `GET /report/resolution-stats` | **200**. |
| Issues by month | `GET /report/issues-by-month` | **200**. |

### Step 9 — Audit & governance

| Use case trace | Endpoint | Notes |
|----------------|----------|--------|
| Audit trail | `GET /audit` | `skip` / `take`. **200** `{ items, total, ... }`. |

### RBAC spot-checks (negative paths)

Do these **without** Authorize, or as a **wrong** role, and confirm **401** / **403** / **400** as appropriate:

- `POST /issue` with no token → **401**.
- `POST /assignment` as **officer** (create officer, login, try assign) → **403**.
- `POST /issue/{id}/close` as **technician** → **403**.
- `GET /report/summary` as **officer** → **403**.

### Full chain (matches `system.use-cases.e2e-spec.ts`)

1. `POST /user/bootstrap-admin` (if needed)  
2. `POST /auth/login` as admin → Authorize  
3. `POST /user` → technician + officer  
4. `POST /auth/login` as **officer** → Authorize → `POST /issue`  
5. `POST /auth/login` as **admin** → Authorize → `POST /assignment`  
6. `POST /auth/login` as **technician** → Authorize → `PATCH .../status` `in_progress` then `resolved` + `resolutionDetails`  
7. `POST /auth/login` as **admin** → Authorize → `POST /issue/{id}/close`  
8. `GET /report/summary` (and other report endpoints)
