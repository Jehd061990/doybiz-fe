# Phase 15 — Staff Frontend

Implements the existing STAFF backend contract.

## Routes
- /app/staff
- /app/staff/create
- /app/staff/:id

## Features
- Staff list/search/filter/pagination
- Create/edit/deactivate staff
- Branch selection
- Staff service assignment UI
- OWNER/MANAGER assignment mutation controls
- CASHIER read-only staff access
- STAFF module route guard

## Backend endpoints
- GET/POST/PUT/DELETE /api/staff
- GET/POST/DELETE /api/staff/:staffId/services/:serviceId
- GET /api/staff/:staffId/services

## Constraints
- Staff belongs to one branch.
- No invented roles/modules.
- Backend remains authoritative for authorization and branch isolation.
