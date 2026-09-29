# Phase 8 — User Management UI

## Implemented Routes

- `/app/users` lists users in the authenticated organization.
- `/app/users/create` creates a user.
- `/app/users/:id` loads and edits one user in the authenticated organization.

All routes use the Phase 7B server-protected `/app` layout and shared Refine provider. The shared navigation displays Users to owners only; a page-level owner gate avoids issuing user/branch requests for non-owners. The backend remains responsible for rejecting unauthorized requests.

## Backend Endpoints Used

- `GET /api/users`: returns `{ success, users }`, complete and sorted by creation time.
- `POST /api/users`: accepts `name`, `email`, `password`, `role`, `permissionPreset`, `branchAccess`, optional `modulePermissions`, and `status`; returns `{ success, user }`.
- `GET /api/users/:id`: returns `{ success, user }` for the authenticated organization.
- `PATCH /api/users/:id`: accepts supported identity/access fields and optional `applyPreset`; returns `{ success, user }`.
- `GET /api/branches`: returns a bare branch array. The backend scopes it to the authenticated organization and the caller's branch access.

The existing Refine data provider and same-origin `/api/backend` proxy are reused. No organization ID is accepted from a form or appended to these requests. The backend derives tenant scope from the authenticated session.

## Organization Access Model

```text
Organization
  └── Users
       ├── Role
       ├── Branch Access
       ├── Module Permissions
       ├── Optional Role Preset
       └── Active/Inactive Status
```

`Role != Branch Access`; `Role != Module Permissions`; `Role Preset != Security Authorization`; and `Branch assignments != Additional Users`. The UI does not calculate seats or billing.

### Role

The selector uses only the backend roles `OWNER`, `MANAGER`, and `CASHIER`. `SUPER_ADMIN` is not an organization role and is not present. A user can be assigned an owner role; backend owner-protection rules govern demotion and deactivation.

### Branch Access

Branches are loaded from the authenticated owner's existing branch list. `OWNER` displays organization-wide access and submits `branchAccess: 'ALL'`. `MANAGER` and `CASHIER` can receive zero or more selected branch IDs. Inactive branches returned by the backend are labeled; the UI does not invent an active-only assignment rule. The backend validates every submitted ID against the organization.

### Module Permissions

The selector uses the existing seven-module registry: `POS`, `SALES`, `APPOINTMENTS`, `CUSTOMERS`, `REPORTS`, `STAFF`, and `BILLING`. The UI displays effective modules returned by the backend and never treats them as a substitute for backend authorization.

### Role Preset and `applyPreset`

The preset selector uses `OWNER`, `MANAGER`, and `CASHIER`; the Owner role is restricted to its Owner preset in the form. The read-only preview mirrors the current backend `rolePermissions` utility. It is a presentation convenience; the backend calculates and returns effective permissions.

On create, “Use backend preset defaults” is selected initially. The form previews the current defaults and omits `modulePermissions` from the request so the backend applies its model defaults. Selecting manual customization sends an explicit `modulePermissions` array.

On edit, the form initializes from the returned effective permissions. Changing a role or preset does not change that module list. “Apply this preset when saving” must be explicitly selected; only then does the update submit `applyPreset: true` and omit `modulePermissions`. The backend applies the selected role/preset and returns the resulting user. Without that action, the selected module list is sent unchanged or with the owner's manual edits.

### Active/Inactive Status

Create defaults to `ACTIVE`; edit uses the existing backend status. Both values are submitted through the existing user API. Authentication and active-user enforcement remain backend responsibilities.

## Owner Protection and Errors

The frontend does not reproduce the last-active-owner algorithm. It displays a specific safe message when the backend rejects a demotion or deactivation because the organization must retain an active owner. Other known errors are mapped for 401, 403, 404, 409, validation, and server/network failures. Unknown backend/database details are not displayed raw. The backend currently reports validation and duplicate-email errors as HTTP 400; these are shown as generic actionable form errors unless they match a known safe message.

## Search and List States

The backend list endpoint has no search, filtering, or pagination query contract and returns the complete organization-scoped result. Name/email search and role/status filtering therefore run in the browser over that returned set; the UI does not claim backend pagination. Loading, empty, no-match, and error states are provided.

## Security

- User list/detail responses come from backend safe-user serializers; `passwordHash` is not rendered.
- The create password is read from the form at submit time, is not stored in React state, is never put in a URL, and is cleared after successful submission. The backend returns a sanitized user without the password hash.
- JWT handling remains the Phase 7B HttpOnly-cookie flow. User Management does not access or store the token.
- Frontend owner checks only control UX. User and branch endpoints enforce authentication, owner role, and organization/branch scope server-side.

## Tests and Verification

Behavior tests cover API mapping, list loading/empty/error/success and local filtering, owner-only navigation/access, create validation and payloads, branch/role/module/status selection, preset preview, custom-module preservation, explicit `applyPreset`, owner-wide branch behavior, safe owner-protection errors, and Phase 7B auth regressions.

Verification commands for this phase:

- `npm run test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Final results: 12 Jest suites and 41 tests passed; lint, TypeScript, and production build passed. Production HTTP checks returned 200 for `/login`; unauthenticated `/app`, `/app/users`, `/app/users/create`, and `/app/users/:id` redirected to `/login` without rendering protected content. No test credentials were available for live authenticated or backend-write smoke tests.

## Limitations and Contract Gaps

- The backend exposes no list search/filter/pagination; the browser filters the complete result locally.
- Preset previews mirror the backend's current default mapping. Create and apply operations still defer to backend behavior and returned user data; keep the display mapping synchronized if the backend defaults change.
- Duplicate email currently reaches the frontend as HTTP 400 and is shown with a generic validation message.
- No backend contract gap blocks the requested list/create/edit workflow. No backend files were modified.

No billing, branch CRUD, subscription, payment, or other business modules were added.