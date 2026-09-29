# Phase 7 — Frontend Foundation

## Objective

Initialize the existing `doybiz-fe` directory as a minimal, testable Next.js App Router application connected to the existing backend through one server-side API boundary. This phase does not implement full business modules.

## Installed Technologies

- Next.js 16.3.6, React/React DOM 19.3.0.
- TypeScript 6.0.3 with strict checking and `@/*` imports.
- Refine Core 5.0.12 and Next.js App Router adapter 7.0.5.
- Jest 30.5.2, jsdom, React Testing Library 16.3.3, and Jest DOM 7.0.1.
- ESLint 10.11.0 with `@eslint/js` 10.0.1, TypeScript-ESLint 8.71.0, and `@next/eslint-plugin-next` 16.3.6.

## Foundation Delivered

- App Router routes for login, a minimal authenticated workspace, and auth/session/backend proxy handlers.
- One typed API request helper and a Refine data provider limited to existing `users`, `branches`, and `billing` resources. Unsupported operations fail explicitly.
- Login through the backend contract, with the returned JWT stored in an HttpOnly cookie and attached to proxied API requests server-side.
- Typed role/module registries and UI-only branch/module/status helpers.
- Jest/RTL coverage for login behavior, authorization helpers, and API URL resolution.
- `.env.example` with the local backend base URL; no real credentials are included.

## Verification Results

Verified during Phase 7 initialization:

- `npm install` completed with 0 reported vulnerabilities.
- `npm test`: 3 suites passed, 6 tests passed.
- `npm run lint`: passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed; Next generated the expected App Router routes.
- Live dev server: `http://localhost:3001`.
- HTTP smoke checks: `/login` rendered with 200; `/api/auth/session` returned unauthenticated; unauthenticated `/api/backend/users` returned 401.
- Backend files were not modified for Phase 7.

## Not Implemented

No full user management, billing UI, branch CRUD, organization CRUD, POS, sales, appointments, customers, reports, staff, or Super Admin. There is no organization-selection login UI for duplicate emails yet; the backend requires `organizationId` in that case. No backend `/api/users/me` endpoint exists, so the HttpOnly user snapshot is used for shell presentation only. Billing calculations and authorization remain backend responsibilities.

## Phase 7B — Authentication and Organization Context

### Progress

- Kept the existing Next.js server-side login flow and HttpOnly JWT cookie; the browser receives no JWT.
- Added a consistent `AuthSession` with the authenticated organization ID and sanitized user authorization fields. `useAuthSession()` reads the real Refine identity rather than maintaining separate client auth state.
- Protected `/app/*` with a server-side session layout. `/` redirects to `/app`, and authenticated visits to `/login` redirect to `/app`.
- Refine login, logout, session check, identity, permission, and unauthorized handling use the existing same-origin routes. Logout expires both cookies; the backend proxy also clears them after an upstream 401.
- Login failures are mapped to safe frontend messages. An organization-required response does not reveal backend text or organization choices.
- Added tests for successful single-organization login/session identity and workspace rendering, HttpOnly JWT cookie handling, invalid credentials, organization-required response sanitization, protected-route redirects, and logout cookie expiration.
- Verification: `npm run test` passed (7 suites, 15 tests); `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed.
- Production HTTP smoke: `/login` returned 200; unauthenticated `/app` streamed a redirect marker to `/login` without rendering workspace content; `/api/auth/session` reported unauthenticated; logout returned 200 and expired both cookies. No non-production test credentials were available for a live backend login, so successful authenticated behavior is covered by controlled frontend tests instead.

### Verified Backend Contract Gap

The backend has no safe pre-auth organization discovery endpoint. `POST /api/auth/login` returns `organizationId is required when email is associated with multiple organizations` before validating the password, so the frontend cannot safely show a selection list and the backend itself can reveal that an email has multiple memberships. The frontend does not add an endpoint or enumerate organizations; it displays a generic support message instead.

For a future selection flow, authenticate the password before exposing any organization choices and return only minimal choices within a short-lived, selection-bound challenge. Invalid credentials should produce the same response regardless of membership count. Successful login currently returns the authenticated organization ID but no organization name; the frontend does not infer profile data from public tenant routes.

No backend files were modified. User Management, Branch Management, billing, subscriptions, invoices, POS, sales, appointments, customers, reports, staff, and Super Admin remain out of scope.
