# Phase 16 — Sales Frontend

## Scope

Implemented the frontend Sales module against the existing backend Sales contract. No Sales backend was recreated.

## Routes

- `/app/sales` — paginated sales history with branch/status/payment/date/search filters.
- `/app/sales/:id` — sale detail, items, payment history, payment recording, and manager/owner void action.

Both routes are protected by the existing `ModuleRouteGuard` and require the `SALES` module.

## Backend endpoints used

- `GET /api/sales`
- `GET /api/sales/:id`
- `GET /api/sales/:saleId/payments`
- `POST /api/sales/:saleId/payments`
- `POST /api/sales/:saleId/void`

Sale creation remains in the existing POS flow using `POST /api/sales`.

## Authorization

- OWNER, MANAGER, CASHIER can read Sales.
- OWNER, MANAGER can void Sales.
- Payment recording follows the backend Sales route contract for all three roles.
- Branch visibility is backend-authoritative; the frontend only selects from `GET /api/branches` results.

## Contract decisions

- No frontend sale-total calculation was added.
- No invented refund/delete workflow was added.
- Completed financial sales are treated as non-editable because the backend rejects edits outside DRAFT.
- Void uses the backend void endpoint; it does not physically delete records.
- Payment methods mirror the backend enum exactly: CASH, GCASH, CARD, BANK_TRANSFER, OTHER.
- No product/inventory UI was added because the inspected Sales backend currently supports SERVICE sale items only.

## Verification

The GitHub connector was used to inspect the backend contract and commit frontend changes. Local Jest/TypeScript/build execution was not available through the repository connector, so local verification should still be run in the development environment.
