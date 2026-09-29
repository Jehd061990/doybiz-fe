# Phase 12 — POS Frontend

## Scope and Route

Implemented `/app/pos` as a service-based sale and payment workflow. The route uses the existing protected `/app` layout and server-side `ModuleRouteGuard` with module key `POS`. Navigation comes from the shared module registry and effective session permissions. No POS-only authentication, organization store, branch system, data client, or backend changes were added.

## Backend Contracts Used

| Method and path | Purpose | Authorization / branch behavior |
| --- | --- | --- |
| `GET /api/branches` | Obtain current user's available branches | Authenticated organization scope and backend branch-access filtering |
| `GET /api/services?branchId=…&status=ACTIVE&page=…&limit=100` | Select service sale items | Requires `APPOINTMENTS`; service is organization-scoped, active, and available at selected branch or organization-wide |
| `POST /api/sales` | Create sale | Requires either `POS` or `SALES`; OWNER/MANAGER/CASHIER; backend requires an active accessible branch and validates services/customer |
| `POST /api/sales/:saleId/payments` | Record full or partial payment | Requires either `POS` or `SALES`; backend validates sale/branch/balance and computes status/change |
| `GET /api/sales/:saleId/receipt` | Load backend receipt details | Requires either `POS` or `SALES` and branch access |

No `/api/pos` endpoint exists. All requests use existing Refine custom hooks, data provider, typed API client, and authenticated proxy.

## Sale Workflow

1. The user selects an active branch from the backend-filtered `useBranches()` result. The `ALL` sentinel is never used as a branch ID.
2. If the session also has `APPOINTMENTS`, the page requests active services for that branch. The service-list endpoint returns its own pagination, reflected by previous/next controls.
3. The user builds a local cart from returned active services, changing quantities or removing entries. No totals or stock values are calculated/claimed as backend data before checkout.
4. Checkout sends `{ branchId, items: [{ itemType: 'SERVICE', referenceId, quantity, discount: 0 }] }` to `POST /api/sales`. Cart state is retained on rejection and cleared only after confirmed creation.
5. The backend creates a `COMPLETED`, initially `UNPAID` sale with generated sale number and authoritative price/totals. The UI displays those returned values and loads the backend receipt.
6. Payment is recorded separately. The form sends amount, one supported method, cash received only for CASH, and optional reference/notes to the sale payment route. The response's sale/payment status and change are displayed; the UI does not mark a sale paid itself.

## POS and SALES Boundary

The backend mounts sale routes behind `authorizeModule(['POS', 'SALES'])`, so either effective permission is accepted for the existing sale APIs. The POS UI route itself requires only `POS`. No Sales history/search page was added; POS only shows the just-created sale and its receipt. The sale creation service currently accepts only `SERVICE` items and rejects other item types, despite broader `SaleItem` schema enum values.

## Branch, Customer, and Payment Behavior

Branch choices are explicit and come from the current authenticated user's branch list. Backend sale creation rechecks organization, active branch, and branch access. `ALL` branch access means all branches for lookup, not a value submitted in the sale payload.

The backend accepts optional `customerId`, but the POS form does not select/create customers. Customer endpoints require the separate `CUSTOMERS` permission, so this workflow can complete without adding a customer.

Supported payment methods are `CASH`, `GCASH`, `CARD`, `BANK_TRANSFER`, and `OTHER`. Multiple/partial payments are supported by the backend. Cash requires `amountReceived`; backend computes and returns change. Sale and payment statuses come from the backend. No refund, POS void, offline transaction, or printer integration is implemented in the POS UI.

## Authorization and Catalog Contract Gap

The POS route/navigation require the effective `POS` module permission; roles are not used to infer it. The backend remains authoritative and allows OWNER/MANAGER/CASHIER when the required module check passes. Branch access is a separate concept.

The backend sale route accepts `POS` **or** `SALES`, but the service catalog route `/api/services` requires `APPOINTMENTS`. Therefore a user with POS but without APPOINTMENTS can open POS but cannot load services to create a sale. The UI surfaces this limitation and does not use public service routes, fabricate a catalog, or bypass module authorization.

Smallest future backend contract change: provide a POS-authorized read-only active-service catalog, scoped to authenticated organization, selected active branch, and branch access; alternatively, adjust only service read-route module authorization to accept POS while keeping service mutations' existing role/module protection. No backend files were modified in Phase 12.

## Unsupported Dependencies and Features

- No product, inventory, stock, variant, category, or package API/model was found for POS sale creation; only SERVICE items are implemented by the sale service.
- No POS-specific cart, draft/hold, transaction history, or offline workflow exists. Existing sales history remains outside this POS slice.
- Receipt data is available through the existing receipt endpoint, but no printing contract/integration was found; the UI displays receipt details only.
- Customer association is backend-optional but not exposed in this POS flow.
- Refund and void routes exist for Sales with role restrictions, but are not included in the cashier POS workflow.

## Tests and Verification

Tests cover POS module permission/navigation, server route guard, APPOINTMENTS catalog dependency, branch availability, service selection/cart quantity, exact sale payload, server-confirmed sale/receipt display, separate partial cash payment payload, backend change/payment status, safe errors, and preserving the cart after failed checkout. Phase 7–11 regression tests remain in the full suite.

Final test/lint/type/build/smoke results are recorded after Phase 12 verification.