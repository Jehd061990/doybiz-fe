# Phase 17 — Reports Frontend

## Scope

Implemented the Reports frontend against the existing backend Reports contract. No new backend report endpoint was introduced.

## Route

- `/app/reports` — report selector with date range and accessible-branch filters.

## Backend endpoints used

- `GET /api/reports/sales/summary`
- `GET /api/reports/sales/daily`
- `GET /api/reports/sales/monthly`
- `GET /api/reports/sales/by-branch`
- `GET /api/reports/sales/by-service`
- `GET /api/reports/sales/by-cashier`
- `GET /api/reports/payments/by-method`
- `GET /api/reports/payments/summary`
- `GET /api/reports/reservations/summary`
- `GET /api/reports/customers/summary`
- `GET /api/reports/services/top`

## Authorization

- The route requires the existing `REPORTS` module permission.
- Financial reports are selectable only for OWNER and MANAGER in the UI, matching backend role authorization.
- CASHIER can use operational reports for reservations and customers.
- Backend authorization remains authoritative.

## Contract decisions

- No frontend financial calculations were added.
- Date range and branch filters are sent to the backend as query parameters.
- Top-services `limit` is sent only to the supported endpoint.
- No charts, exports, or unsupported filters/endpoints were invented.
- Report values are rendered from backend responses.

## Verification

Run Jest, TypeScript, and production build locally after pulling the commit.
