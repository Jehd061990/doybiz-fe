# Phase 11 — Core Operational Module Foundation

## Scope

Phase 11 establishes one frontend module registry, permission-aware navigation, and a reusable server route guard. It does not implement POS, Sales, Appointments, Customers, Reports, or Staff screens/APIs.

## Registry Source of Truth

The backend `src/models/User.ts` defines organization roles `OWNER`, `MANAGER`, `CASHIER` and module keys `POS`, `SALES`, `APPOINTMENTS`, `CUSTOMERS`, `REPORTS`, `STAFF`, `BILLING`. No `INVENTORY` or `SUPER_ADMIN` appears in the organization module/role registry.

The backend defaults owner permissions to all current modules; Manager/Cashier defaults come from `rolePermissions.ts`. User documents can also contain custom effective `modulePermissions`. The frontend consumes the authenticated session's returned effective permissions and does not calculate those defaults from role or preset.

`src/config/modules.ts` now contains the single `MODULE_REGISTRY` with backend key, display label, and a route only when the feature exists. The current routes are `null` for POS, Sales, Appointments, Customers, Reports, and Staff, and `/app/billing` for Billing. `MODULES` and `ModuleName` derive from this registry; User Management's permission selector also reads its labels/keys here.

## Navigation and Route Access

The app shell keeps workspace administration links separate from module links. Module navigation is generated only for registry entries with a real route and `canAccessModuleRoute` access. Therefore Billing appears only when the authenticated user has effective `BILLING` permission and an OWNER/MANAGER role, matching backend billing read authorization. POS/Sales/etc. do not appear as broken or placeholder links.

`hasModuleAccess(user, module)` checks only the effective module permission. `canAccessBranch` remains independent. `canAccessModuleRoute` adds the implemented-route requirement and route-specific UX role constraints; it never grants access based on role alone.

`ModuleRouteGuard` is a server component for future module layouts. It reads the existing HttpOnly-cookie-backed session, redirects unauthenticated users through `/login`, and renders a safe denied/not-available message without rendering protected children. The existing `/app/billing/layout.tsx` uses it; Billing's existing component gate remains as defense-in-depth UX and retains owner-only mutation checks. The backend remains the security boundary and continues to enforce module/role checks on every API request.

## Backend Route Requirements Observed

- `/api/sales` accepts either `POS` or `SALES` module permission.
- `/api/reservations` and `/api/services` require `APPOINTMENTS`.
- `/api/customers` requires `CUSTOMERS`.
- `/api/reports` and `/api/dashboard` require `REPORTS`.
- `/api/staff` requires `STAFF`.
- `/api/billing` and `/api/subscription` require `BILLING`, with billing reader/mutation role rules layered on top.

These API requirements are documented for future routes; no new API calls or operational module pages were added here.

## Authorization Model

Role, branch access, and module permissions stay distinct. Module navigation reads the session's effective `modulePermissions`; it does not infer module access from `OWNER`, `MANAGER`, or `CASHIER`. Branch assignment is not part of module checks. Frontend navigation/route guards are UX only; backend middleware remains authoritative.

## Tests

Tests verify the registry order/labels/routes and absence of `INVENTORY`/`SUPER_ADMIN`, independent module and branch checks, route access requiring both an effective permission and implemented route, owner/manager Billing access, cashier/missing-permission denial, safe server guard behavior, and existing navigation/regression behavior.

Verification: 21 suites and 82 tests passed; lint, strict TypeScript, and production build passed. HTTP smoke returned 200 for `/login`; unauthenticated `/app`, `/app/organization`, `/app/branches`, `/app/users`, and `/app/billing` redirected to `/login`. The session endpoint reported unauthenticated. No new operational module routes were added.

## Limitations

Only Billing currently has a module route. The six operational modules remain unsupported in the frontend and stay out of navigation until their actual feature routes are implemented. No backend files or endpoints were changed.