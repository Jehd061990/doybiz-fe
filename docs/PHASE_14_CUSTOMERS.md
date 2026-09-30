# Phase 14 — Customers Frontend

## Scope
Implements the existing backend customer contract without inventing endpoints.

### Routes
- /app/customers
- /app/customers/create
- /app/customers/:id

### Backend endpoints
- GET /api/customers
- POST /api/customers
- GET /api/customers/:id
- PUT /api/customers/:id
- DELETE /api/customers/:id

### Features
- Customer list with server-side search, phone and status filters
- Create customer
- View/edit customer
- Deactivate customer
- CUSTOMERS module route guard
- Navigation is driven by the existing module registry
- Backend remains authoritative for authorization and tenant isolation

### Deliberate constraints
- No branch assignment: Customer model is organization-scoped, not branch-scoped.
- No frontend billing calculations.
- No direct JWT handling.
- No invented customer fields or endpoints.
- Delete is presented as deactivation because backend soft-deletes via status.

## Verification
Run from the frontend repository:
- npm test -- --runInBand
- npm run lint
- npx tsc --noEmit
- npm run build
- git diff --check
