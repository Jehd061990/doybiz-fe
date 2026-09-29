# Phase 10 — Billing and Organization Seat Management

## Scope and Routes

- `/app/billing`: backend estimate, subscription summary, pending adjustments, and billing history.
- `/app/billing/:id`: billing record detail, backend payment totals/history, and owner-only Xendit initiation for payable records.
- `/app/billing/adjustments/create`: owner-only prepaid adjustment target selection.

Billing is part of the existing protected App Router and Refine application. The existing `billing` Refine resource, typed API client, same-origin authenticated backend proxy, and HttpOnly session are reused. No new API client, organization store, or payment SDK was added.

## Backend Contract Inspected

| Method and route | Backend behavior | Frontend use |
| --- | --- | --- |
| `GET /api/subscription` | Authenticated BILLING module; OWNER/MANAGER; organization subscription populated with plan | Read-only status, term, and period |
| `GET /api/subscription/estimate` | Authenticated BILLING module; OWNER/MANAGER; backend calculates seats/prices | Seat and estimate display |
| `POST /api/subscription/activate` | OWNER; accepts `paymentTermMonths` in 1, 3, 6, 12; creates subscription and setup invoice | Initial prepaid activation when no subscription exists |
| `GET /api/billing` | Authenticated BILLING module; OWNER/MANAGER; `{ success, billing }` | Billing history |
| `GET /api/billing/:id` | OWNER/MANAGER; returns record, completed payments, `paidAmount`, and `outstandingAmount` | Record detail; provider preserves nested response fields |
| `POST /api/billing/generate` | OWNER; generates/updates the current subscription invoice | Explicit owner action for current invoice |
| `POST /api/billing/adjustments` | OWNER; accepts user/branch target IDs; backend computes chargeable additions and creates/updates a pending adjustment | Prepaid adjustment target selection |
| `POST /api/billing/:id/xendit/payment` | OWNER; starts/reuses Xendit request; returns billing record, pending payment, provider status, and actions | Payment initiation and provider-returned redirect link |

Additional endpoints inspected but not called directly by this UI: `GET /api/subscription/plan` (the estimate already includes plan summary), `GET /api/billing/:id/payments` (detail already includes completed payments), `POST /api/billing/:id/payments` (manual payment recording), and `POST /api/subscription/cancel` (subscription cancellation). The webhook `POST /api/billing/xendit/webhook` is backend-only and is never called from the frontend.

## Seat and Invoice Display

Active organization users, included seats, additional users, plan, and monetary estimate are displayed from `GET /api/subscription/estimate`. The frontend does not count users/branches, derive included seats, or calculate chargeable users or prices.

Subscription status, prepaid term, current period, and setup-fee status come from `GET /api/subscription`. No auto-renew, renewal, or cancellation controls are exposed. Invoice/history/detail values and line items are read from billing records. The data provider preserves detail payments and backend-calculated paid/outstanding totals.

## Prepaid Adjustments

Owners select organization users and branches returned by the existing Refine resources. The frontend sends only `{ userIds, branchIds }`; it does not send an organization ID, branch/user prices, or chargeability decisions. The owner must acknowledge that selected branches and backend-selected chargeable users may become pending/inactive until payment is verified. The resulting backend billing record is opened for review/payment. Existing pending adjustments may be merged by the backend.

The UI does not activate users or branches after payment initiation. Backend webhook reconciliation determines payment completion, record status, and target activation. It also does not assume all selected users are chargeable or display calculated incremental-seat totals.

## Xendit Boundary and Status

Payment initiation uses `POST /api/billing/:id/xendit/payment` through Refine's custom mutation and the authenticated proxy. No Xendit browser SDK, credentials, or webhook request is used. The returned HTTPS action URL is exposed as a link; the UI never constructs a provider URL. Payment request status is displayed as pending/provider status, not paid. The detail page refetches billing state on request and after initiation. Only backend-reported `PAID` records are read-only and shown as paid.

The manual payment-recording endpoint is not exposed in this UI. Paid billing records have no edit/delete/payment mutation controls.

## Authorization

Billing read UI requires the authenticated user to be OWNER or MANAGER with the `BILLING` module, matching `authorizeModule('BILLING')` and billing reader roles. Initial activation, invoice generation, adjustments, and Xendit payment controls are OWNER-only in the UI, matching backend role restrictions. These checks improve UX only; backend authentication/module/role checks remain authoritative.

## Billing Lifecycle Limits

The backend supports initial prepaid activation and a manual current-invoice generation endpoint. It has no recurring renewal scheduler/workflow in the inspected routes/services. No renewal, auto-charge, cancellation UI, or payment-success callback logic is implemented. The existing subscription `autoRenew` field is not treated as evidence of a functioning recurring workflow.

## Tests and Verification

Behavior tests cover backend-sourced seat values, subscription display and activation terms, owner/manager access, empty/loading/error states, invoice generation, adjustment target payload and pending-state acknowledgement, record/payment details, paid immutability, payment mutation URL, returned HTTPS action link, pending-not-paid behavior, disabled payment initiation while loading, safe error mapping, and Phase 7B–9 regressions.

Final results: 19 Jest suites and 75 tests passed; `npm run lint`, `npx tsc --noEmit`, and `npm run build` passed. HTTP smoke returned 200 for `/login`; unauthenticated `/app`, `/app/organization`, `/app/branches`, `/app/users`, `/app/billing`, and `/app/billing/:id` redirected to `/login` without protected content. `/api/auth/session` reported unauthenticated. No non-production credentials were available for live billing/payment testing.

## Contract Gaps and Limitations

- No recurring/renewal scheduler or automated renewal invoice workflow is available; none is implemented.
- Billing detail returns only completed payments. A pending Xendit request is displayed from the initiation response; the backend initiation endpoint can return its existing pending request again when the owner retries.
- The billing detail payments list does not return user names for adjustment line targets; the UI avoids displaying internal user IDs and shows backend line descriptions/target type.
- The Xendit return/callback destination is not part of the backend initiation contract. Owners return to the record page and explicitly refresh; payment status remains backend-authoritative.
- No backend files were modified.