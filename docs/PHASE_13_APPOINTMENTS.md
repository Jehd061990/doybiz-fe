# Phase 13 — Appointments Frontend

## Scope and Routes

Implemented the Phase 13 Appointments frontend module covering the Services Catalog and Reservations / Appointments management.
Routes implemented under `/app/appointments`:
- `/app/appointments` — Reservations and appointments dashboard / list with branch, status, and date filters.
- `/app/appointments/reservations/create` — Create reservation form with branch, customer, service, staff, date, time, and notes.
- `/app/appointments/reservations/[id]` — Reservation details view and status update / cancellation.
- `/app/appointments/services` — Services catalog management list with search, branch scope filter, status filter, and pagination.
- `/app/appointments/services/create` — Create service form.
- `/app/appointments/services/[id]` — Edit service form and deletion.

All routes are protected by the existing session layout and `ModuleRouteGuard` with module key `APPOINTMENTS`.

## Backend Contracts Used

| Method and path | Purpose | Authorization / branch behavior |
| --- | --- | --- |
| `GET /api/branches` | Load accessible active branches | Authenticated organization scope and backend branch-access filtering |
| `GET /api/services` | List/search services catalog | Requires `APPOINTMENTS`; filters by branch, status, search query, pagination |
| `POST /api/services` | Create service | Requires `APPOINTMENTS` and `OWNER` or `MANAGER` role |
| `GET /api/services/:id` | Load service details | Requires `APPOINTMENTS` and branch access |
| `PUT /api/services/:id` | Update service | Requires `APPOINTMENTS` and `OWNER` or `MANAGER` role |
| `DELETE /api/services/:id` | Delete service | Requires `APPOINTMENTS` and `OWNER` or `MANAGER` role |
| `GET /api/reservations` | List/filter reservations | Requires `APPOINTMENTS`; filters by branch, date, status, staff, customer, pagination |
| `POST /api/reservations` | Create reservation | Requires `APPOINTMENTS`; validates customer, branch access, service branch, staff qualification, date/time, and schedule overlap |
| `GET /api/reservations/:id` | Load reservation details | Requires `APPOINTMENTS` and branch access |
| `PUT /api/reservations/:id` | Update reservation | Requires `APPOINTMENTS` and branch access |
| `DELETE /api/reservations/:id` | Cancel/delete reservation | Requires `APPOINTMENTS` and branch access |
| `GET /api/customers` | Load active customers for reservation booking | Requires `CUSTOMERS` permission |
| `GET /api/staff` | Load active staff for reservation booking | Requires `STAFF` permission |

## Services Catalog & POS Integration

The Services Catalog UI in Phase 13 is the authoritative management interface for the backend service resource. Phase 12 POS continues consuming this exact same backend service resource (`GET /api/services`) without duplication or architectural divergence.

## Authorization & Role Behavior

- **Module Permission:** `APPOINTMENTS` required for all appointment routes.
- **Role Enforcement:**
  - `OWNER` / `MANAGER`: Can create, update, and delete services; create, view, update, and cancel reservations.
  - `CASHIER`: Can view services and list/create/update reservations.

## Tests and Verification

Tests cover appointment error mapping, module permission guard, navigation integration, and regression tests for Phases 7–12.
