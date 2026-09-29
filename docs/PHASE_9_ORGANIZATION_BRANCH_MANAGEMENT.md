# Phase 9 — Organization and Branch Management UI

## Backend Contract Inspection

The Express app registers `/api/branches` and has no `/api/organizations` route or organization controller. The organization model contains `name`, optional `slug`, `email`, `phone`, `address`, and `status`, but the authenticated login/session exposes only the current organization ID. Registration returns an organization profile, but that response is not a current-session organization lookup and is not used here. Public tenant routes are not used to infer an authenticated organization's profile.

| Operation | Existing backend contract | Authorization / result |
| --- | --- | --- |
| `GET /api/branches` | Returns a bare array of Branch records | Any authenticated `OWNER`, `MANAGER`, or `CASHIER`; scoped to the authenticated organization and current user's allowed branch IDs |
| `POST /api/branches` | Accepts `name`, `address`, `contactNumber`, optional `status`; returns the raw Branch record | Authenticated `OWNER` only; service supplies organization ID from authenticated user |
| `GET /api/branches/:id` | Not registered | Unsupported |
| `PATCH /api/branches/:id` | Not registered | Unsupported |
| `DELETE /api/branches/:id` | Not registered | Unsupported |
| Organization GET/PATCH | No organization management route is registered | Unsupported |

The Branch model requires `name`, `address`, and `contactNumber`; `status` is `ACTIVE | INACTIVE` and defaults to `ACTIVE`. The schema accepts that status on create. There is no API to update an existing branch status. The `Branch` collection also contains organization and billing fields, but the UI does not expose internal billing attributes or allow the browser to set organization ownership.

The backend branch route mounts `authenticateUser` globally. GET authorizes all three organization roles and calls `getBranches` using the authenticated organization ID and `getAllowedBranchIds`; OWNER receives all branches, while other roles receive only assigned branches. POST adds `authorizeRole(['OWNER'])`. The controller returns branches as a bare array and raw create errors as an `error` field with HTTP 400; the frontend maps errors safely.

## Implemented Routes

- `/app/organization`: read-only organization ID from the Phase 7B authenticated session.
- `/app/branches`: backend-returned branches, with local name/address/contact search and status filter.
- `/app/branches/create`: owner-only create form.

No organization profile/edit, branch detail/edit/status-update, or branch delete page is implemented because the backend does not expose those contracts. Branches appears in navigation for all roles allowed to list them; only OWNER sees branch creation actions.

## Architecture and Scope

The UI reuses the existing protected `/app` layout, Refine provider, typed API client, backend proxy, auth session, and `branches` Refine resource. `useBranches()` wraps the existing Refine `useList` call and is shared with Phase 8 User Management. No separate organization state store or organization resource is created. The organization view displays only `session.organization.id`; organization name, status, address, phone, subscription, and settings are not available from the authenticated-session contract.

```text
Organization
│
├── Branches
│     ├── Branch A
│     ├── Branch B
│     └── Branch C
│
└── Users
      ├── Role
      ├── Branch Access
      ├── Module Permissions
      ├── Optional Role Preset
      └── Active/Inactive Status
```

`Organization scope != Branch access != Module permissions != Role`. A branch is not a user; users may be assigned to multiple branch IDs. Branch create does not calculate seats, create billing records, or call a payment provider. Billing remains backend-authoritative.

## Branch Form and Errors

The create form requires the backend model fields `name`, `address`, and `contactNumber`, and allows only the model's supported initial statuses. It uses the Refine `create` mutation for the `branches` resource. No organization ID is submitted. Successful creation shows a confirmation and clears entered fields; loading disables repeat submission. Backend validation/authorization/server errors are translated using the Phase 8 safe management error mapper.

## Phase 8 Integration

User Management now uses the same `useBranches()` hook for branch lists. Its branch selector continues to display returned branch names/statuses and submits arrays of selected branch IDs for non-owners or `'ALL'` for owners. The backend validates organization ownership of submitted branch IDs. Role, branch access, module permissions, and preset semantics remain separate.

## Billing Relationship

No seat capacity, active-branch count, billing calculation, payment, invoice, or subscription logic is implemented. Creating a branch only calls the existing branch endpoint; any capacity or billing effect is handled by the backend.

## Tests and Verification

Behavior tests cover organization ID sourced from session, branch list success/loading/empty/error/filter states, branch status display, role-specific list/create actions, exact create fields, validation, safe errors, success feedback, and Phase 8 branch-selector regression. Data-provider tests verify the branch list/create response shapes and explicitly reject unsupported organization/detail/update API operations.

Verification commands:

- `npm run test`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Final results: 15 Jest suites and 54 tests passed; lint, TypeScript, and production build passed. HTTP smoke returned 200 for `/login`; unauthenticated `/app`, `/app/organization`, `/app/branches`, `/app/branches/create`, and `/app/users` redirected to `/login` without rendering protected content. The session endpoint reported unauthenticated. No test credentials were available for authenticated live CRUD testing.

## Limitations and Contract Gaps

- Organization profile name/details/status cannot be displayed from the authenticated session; there is no organization GET/PATCH API. The UI shows only the authenticated organization ID.
- Branch detail, edit, status update, and delete are not supported by the backend. Existing branch status is read-only; status can be selected only on create.
- Branch list has no backend search/filter/pagination parameters; available branches are filtered locally without claiming server-side pagination.
- No backend files were modified. No contract gap blocks the supported branch list/create experience.