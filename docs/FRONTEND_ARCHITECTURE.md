# Frontend Architecture

## Runtime and Dependencies

- Next.js 16.3.6 with the App Router and React 19.3.0.
- TypeScript 6.0.3 with `strict: true` and the `@/*` alias to `src/*`.
- Refine Core 5.0.12 with `@refinedev/nextjs-router` 7.0.5 App Router bindings.
- Jest 30.5.2 and React Testing Library 16.3.3.
- ESLint 10.11.0 with `@eslint/js`, TypeScript-ESLint, and Next's standalone `@next/eslint-plugin-next` rules. This avoids the current Next preset's React-plugin incompatibility with ESLint 10.

## Routes and Shell

The app uses Next App Router files under `src/app`. `/app/*` is protected by a server layout that checks the cookie-backed session and redirects unauthenticated requests to `/login`. `/` redirects to `/app`, and an authenticated user visiting `/login` is redirected to `/app`. Authentication endpoints are Next route handlers under `/api/auth/*`; the authenticated backend proxy is `/api/backend/[...path]`.

Refine is mounted once in `src/app/providers.tsx`. Its router provider comes from the public `@refinedev/nextjs-router/app` entry. The current resource registry contains only actual backend resources: `users`, `branches`, and `billing`. Unsupported CRUD operations fail explicitly rather than inventing endpoints.

## Backend and API Client

The backend base URL is server-only `DOYBIZ_API_URL`, defaulting by configuration example to `http://localhost:3000/api`. One typed JSON request helper lives in `src/lib/api/client.ts`. Components and Refine use same-origin routes; they do not make separate direct-fetch or Axios calls to the backend.

The `/api/backend/*` route handler reads the HttpOnly backend-token cookie, attaches `Authorization: Bearer ...` server-side, and proxies the selected request method/path/query. Backend authorization remains the security boundary. The provider understands the existing response differences (bare branch arrays versus wrapped user/billing payloads) where needed; it does not change backend shapes. User list/create/get/update map to the existing `GET /api/users`, `POST /api/users`, `GET /api/users/:id`, and `PATCH /api/users/:id` contracts. Branch lists use the bare-array `GET /api/branches` response.

## User Management

User Management lives at `/app/users`, `/app/users/create`, and `/app/users/:id`, inside the existing protected `/app` layout and Refine provider. The frontend uses Refine's existing `users` and `branches` resources and data provider. It never supplies an organization ID in user requests; the backend scopes every operation to the authenticated user's organization.

The user list is the complete, backend-sorted organization response. The backend has no user pagination or search/filter query contract, so name/email search and role/status filters are client-side only. User management is owner-only in the UI (navigation and page gate) and independently enforced by the backend user routes. A 401/403 response is handled through Refine auth/error behavior; frontend checks are not an authorization boundary.

The UI keeps role, branch access, module permissions, role preset, and status as separate fields. Owners use organization-wide `branchAccess: 'ALL'`; non-owner selections are branch ID arrays sourced from the authenticated owner's branch response. The module preset preview mirrors the current backend `rolePermissions` utility for presentation only. Create requests omit `modulePermissions` when backend preset defaults are selected, allowing backend model defaults to apply. Edit requests preserve the returned effective module list when role/preset selection changes; only the explicit “Apply this preset when saving” action sends `applyPreset: true`, allowing the backend to replace that list. Backend responses remain authoritative.

The backend returns all organization users with `passwordHash` removed and has no pagination/filter parameters. Duplicate-email errors currently use HTTP 400, so unrecognized validation details are shown as a generic form error rather than exposing database messages. Last-active-owner rejections are translated to a clear message without duplicating the backend protection rule. Seat billing is not calculated or mutated by this UI.

## Organization and Branches

`/app/organization` displays only the organization ID from the existing authenticated session. There is no registered organization-management API; the organization model's name, address, phone, and status are not available from login/session and are not inferred from public tenant routes. The page is read-only, and the Refine resource registry does not add a fake `organizations` resource.

`/app/branches` uses the shared `useBranches()` hook and the real `GET /api/branches` resource. The backend scopes the returned bare array to the authenticated organization and the current user's allowed branch IDs. All backend-supported roles may list branches; the UI does not display branches not returned by the backend. Search/status filters are local because this endpoint has no query filtering or pagination contract.

`/app/branches/create` is available to owners in the UI and uses the existing `POST /api/branches` mapping through Refine. Its fields are the backend model's `name`, `address`, `contactNumber`, and supported initial `status` (`ACTIVE` or `INACTIVE`). Organization ID is never sent by the browser; the service attaches the authenticated organization's ID. The backend restricts create to owners.

The backend exposes no branch get-by-ID, patch, status-update, or delete route. The frontend therefore has no branch edit/detail/deletion UI. A branch status can only be selected when creating it; existing status is displayed read-only. User Management shares the same `useBranches()` data source and continues to submit branch IDs through the existing user endpoints.

Branch count and seat billing are not computed or mutated in the frontend. Branch/user relationship and billing remain backend responsibilities.

## Billing

Billing is available under `/app/billing`, with record detail at `/app/billing/:id` and owner-only prepaid adjustment creation at `/app/billing/adjustments/create`. The shared Refine `billing` resource and authenticated proxy back billing list/detail; custom Refine requests use the same data provider and centralized API client for subscription estimate/status, invoice generation, adjustment creation, subscription activation, and Xendit initiation.

Only OWNER/MANAGER users with the `BILLING` module see the read UI, matching backend middleware. OWNER-only actions are initial prepaid subscription activation, invoice generation, adjustment creation, and Xendit payment initiation. The backend's estimate response supplies active users, included seats, additional users, and amounts; the frontend renders those fields without reproducing seat or price calculations.

Billing record details preserve the backend's completed payment list and paid/outstanding totals. PAID and VOID records have no payment action. Xendit initiation is a backend custom mutation; the UI follows only an HTTPS action URL returned by the backend, keeps the record pending until backend refresh reports otherwise, and never calls the webhook or manual-payment endpoint. Adjustment targets are selected by ID from authenticated organization user/branch lists; the backend decides chargeability and activation. The UI explicitly warns that selected branches and chargeable users can become pending/inactive until verified payment processing.

Initial prepaid activation uses backend-supported terms and opens the returned setup invoice. Subscription status/period are read-only; cancellation and renewal scheduling are not exposed. No recurring/renewal billing workflow was found. The backend owns webhook reconciliation, invoice immutability, pending target activation, and all billing calculations.

## Authentication

The login handler calls the existing `POST /api/auth/login` backend endpoint. It accepts the backend's sanitized user and JWT, validates the required public fields, and sets the JWT in an HttpOnly, same-site cookie. A second HttpOnly cookie stores the public user snapshot needed for server-rendered shell identity; neither cookie is readable by browser JavaScript. Logout expires both cookies, and the authenticated backend proxy also expires them on an upstream 401. The login page does not persist or log the password.

`AuthSession` is the single session representation: it contains `authenticated`, an organization context with the authenticated organization ID, and the sanitized user with role, status, branch access, and module permissions. `useAuthSession()` obtains the user through Refine's `getIdentity`; it derives the organization context from that same user instead of keeping duplicate React auth state. Refine's `login`, `logout`, `check`, `getIdentity`, `getPermissions`, and `onError` are backed by the real same-origin session endpoints.

The backend requires `organizationId` when the same normalized email belongs to multiple organizations. The frontend sanitizes this response and does not try to discover or enumerate organizations. There is no safe organization-selection flow in the current backend contract, so users needing an organization ID are shown a generic sign-in support message; they are not presented with fabricated choices. A single-organization account continues directly to `/app` after login.

There is no `/api/users/me` backend endpoint, and login returns an organization ID but not an organization profile/name. The local session snapshot is the sanitized login result and is for presentation only; role/module/branch checks in the frontend are UX aids and never authorize backend requests. Organization profile details must not be inferred from public tenant endpoints or unrelated records.

### Authentication contract gap

The backend decides that `organizationId` is required before it checks the submitted password. Its current response therefore exposes that an email matches multiple organizations to an unauthenticated caller, even though it returns no organization list. The frontend suppresses the raw response and does not expose membership details, but it cannot safely offer organization selection under this contract.

The smallest safe selection contract is for login to validate the submitted credentials first. Only after successful credential verification should it return an `ORGANIZATION_REQUIRED` challenge with the minimal organization choices needed to continue, protected by a short-lived challenge that must be presented with the selected organization ID. Invalid credentials must have the same response whether or not the email has multiple memberships. Separately, a successful login may include a sanitized `{ id, name }` for the authenticated organization if the UI needs a display name; it must not return other memberships.

## Authorization Types

`src/config/roles.ts` and `src/config/modules.ts` mirror the current backend registries exactly. The single `MODULE_REGISTRY` maps all seven backend keys to labels and a route only when the module UI exists; currently Billing is the only routable operational module. `hasModuleAccess` reads effective permissions from the authenticated user; `canAccessModuleRoute` also requires a registered route and any route-specific UX role constraint. Module access never checks branch access. `canAccessBranch` remains independent.

The app shell builds operational navigation from registry entries with implemented routes and effective permission. Future module routes can wrap their content in the server-side `ModuleRouteGuard`, which reuses the existing cookie-backed session, redirects unauthenticated users through the existing login route, and renders a safe denied/not-yet-available state. Billing uses this guard and retains its existing OWNER/MANAGER + BILLING-module check. These frontend checks only improve UX; backend middleware remains the security boundary.

## Environment

Copy `.env.example` to a local environment file and set `DOYBIZ_API_URL` for the backend. The frontend does not expose this server-only URL as a `NEXT_PUBLIC_*` value. No credentials or signing secrets are included in the example.

## Structure

- `src/app`: App Router pages, layouts, and route handlers.
- `src/components`: login UI, shared authenticated shell, user/branch/billing screens and forms, and reusable access controls.
- `src/providers`: Refine and auth providers.
- `src/lib/api`: centralized API helper and Refine data provider.
- `src/lib/auth`: server session parsing, cookie names, and UI access helpers.
- `src/config`: role, module, and preset registries.
- `src/types`: frontend auth/session response types.
- `docs`: architecture, test strategy, and Phase 7 notes.

User Management CRUD is implemented under `/app/users`; supported branch list/create is under `/app/branches`; billing and seat display are under `/app/billing`. No organization CRUD, branch edit/delete, POS, reports, or Super Admin implementation is included.
