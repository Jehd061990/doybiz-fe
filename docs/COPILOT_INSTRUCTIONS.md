# DOYBIZ Frontend — Copilot Instructions

## 1. Project Context
This is the frontend application for the DOYBIZ business management system.

The frontend project is located at:

`doybiz/doybiz-fe`

The backend project is located separately at:

`doybiz/doybiz-be`

The backend already contains a working organization-level user, authorization, branch-access, module-permission, role-preset, and seat-billing architecture.

The frontend MUST integrate with the existing backend architecture.

---

## 2. Critical Development Rule

### DO NOT rebuild the project from scratch.
Before creating, deleting, replacing, or significantly modifying files:

1. Inspect the existing project structure.
2. Inspect `package.json`.
3. Inspect the existing source files.
4. Identify the existing routing architecture.
5. Identify the existing authentication architecture.
6. Identify the existing API/data-access architecture.
7. Identify existing UI components and styling conventions.
8. Identify the existing testing setup.
9. Inspect the backend API contracts when frontend behavior depends on backend rules.
10. Reuse existing implementation whenever possible.
Do not assume that a feature is missing simply because it has not been mentioned in the current prompt.

---

## 3. Frontend Technology Direction
The planned frontend stack is:

- Next.js
- React
- TypeScript
- Refine
- Jest
- React Testing Library
However, these technologies MUST NOT be installed or introduced blindly.

First inspect the existing project and determine:

- Which framework/version is already installed
- Which React version is already installed
- Whether TypeScript is already configured
- Whether Refine already exists
- Whether Jest already exists
- Whether React Testing Library already exists
- Whether another testing framework is already configured
- Whether an existing component library is being used
- Whether authentication and API clients already exist
If a compatible implementation already exists, integrate with it instead of replacing it.

---

## 4. Backend Is the Source of Truth
The backend (`doybiz-be`) is the authoritative source for:

- Authentication
- Authorization
- Organization membership
- Branch access
- Roles
- Module permissions
- User status
- Seat billing
- Billing calculations
- Subscription/billing state
- Server-side validation
The frontend must NOT attempt to replace backend authorization.

Frontend permission checks are for:

- UI visibility
- navigation
- user experience
- preventing unnecessary actions
They are NOT a security boundary.

The backend must remain responsible for enforcing authorization.

---

## 5. Organization Model
Users are organization-scoped.

The frontend must preserve the distinction between:

### Organization
The top-level business/account context.

### Branch
A location belonging to an organization.

### User
A user belonging to an organization.

### Role
The user's organizational role.

Current supported roles:

- OWNER
- MANAGER
- CASHIER

### Branch Access
Determines which branches a user can access.

### Module Permissions
Determines which application modules a user can access.

These concepts MUST remain separate.

Do not combine role, branch access, and module permissions into one permission system.

---

## 6. Existing Module Registry
The current supported modules are:

- POS
- SALES
- APPOINTMENTS
- CUSTOMERS
- REPORTS
- STAFF
- BILLING
`INVENTORY` is NOT currently an existing module.

Do not add `INVENTORY` to frontend permission selectors, presets, navigation, or API requests unless the backend module registry is explicitly updated first.

---

## 7. Role Presets
The frontend must support role presets as defaults.

A preset may define default module permissions for a role.

However:

### Preset != final permissions
Users may have custom module permissions.

The frontend must preserve the distinction between:

```
Role
↓
Preset / default permissions
↓
Custom module permissions
```
Existing custom permissions must not be silently overwritten.

If the backend supports an explicit `applyPreset` operation, the frontend should expose that behavior clearly.

The user should understand when applying a preset will change existing permissions.

---

## 8. User Management UX
The planned User Management interface should support:

- User list
- User details
- Create user
- Edit user
- Active/inactive status
- Role selection
- Role preset
- Branch access
- Module permissions
- Validation
- Permission-aware UI
A user creation/edit form should conceptually separate:

```
Basic Information

Role

Role Preset

Branch Access

Module Permissions

Account Status
```
Do not create a confusing single "permissions" field that mixes all of these concepts.

---

## 9. Branch Access
Branch access is independent from role.

Owners have organization-wide branch access according to the backend architecture.

Non-owner users may be restricted to explicitly assigned branches.

The frontend must not display branches that the current user is not allowed to access when the backend provides a restricted branch list.

Never assume that a branch ID supplied by the browser is authorized.

The backend remains authoritative.

---

## 10. Billing / Seat Model
Seat billing is organization-level.

The current backend calculation uses:

```
activeOrganizationUsers
includedUserSeats = activeBranches × 3
additionalUsers = max(0, activeOrganizationUsers - includedUserSeats)
```
Important rules:

- User count is organization-wide.
- Branch assignments do not multiply a user's seat count.
- A user assigned to multiple branches is still one organization user.
- Inactive users are excluded from active seat calculations.
- Expanding the number of active branches increases included seats.
- Paid invoices remain immutable.
- Prepaid user adjustments may contain users without a branch ID.
- Users covered by unpaid adjustments remain pending until the corresponding verified payment flow activates them.
- Xendit webhook reconciliation is handled by the backend.
Do not duplicate billing calculations in the frontend.

The frontend should display backend-provided billing values.

---

## 11. Authentication
Inspect the existing authentication implementation before changing it.

Do not introduce a second authentication mechanism.

Do not duplicate token/session handling.

Do not store credentials insecurely.

Do not expose sensitive backend data to the browser unnecessarily.

If authentication state already exists, integrate with it.

---

## 12. API Integration
Before creating API hooks/services:

1. Inspect existing API utilities.
2. Inspect existing HTTP client configuration.
3. Inspect authentication handling.
4. Inspect backend routes/controllers/services.
5. Reuse existing API patterns.
If Refine is introduced, configure its data provider/auth provider around the existing backend rather than creating a parallel API architecture.

Avoid having:

```
Component → fetch()
Component → axios()
Component → custom API helper
Component → Refine data provider
```
for the same type of operation.

Prefer a consistent data-access architecture.

---

## 13. Refine Integration
Refine should be introduced as an application framework layer, not as a reason to rewrite working frontend code.

Potential resources include:

- users
- branches
- organizations
- billing
- invoices
Resource names and routes must match the actual backend API.

Do not invent endpoints.

Before implementing a Refine resource, inspect the backend route and controller contract.

---

## 14. Testing Requirements
Frontend development must include automated testing.

Preferred testing stack:

- Jest
- React Testing Library
If an equivalent testing setup already exists, evaluate it before replacing it.

Tests should focus on application behavior rather than implementation details.

### Examples
Test:

```
Cashier with POS permission
→ can access POS
```
Test:

```
Cashier without POS permission
→ cannot access POS
```
Test:

```
User assigned to Branch A
→ Branch A is available
```
Test:

```
User not assigned to Branch B
→ Branch B is not presented as an accessible branch
```
Test:

```
Role preset selected
→ expected default permissions are displayed
```
Test:

```
Custom permissions exist
→ changing a preset does not silently overwrite them
```
Test:

```
Owner
→ can access organization user management
```
Test:

```
Non-owner
→ cannot access owner-only user-management actions
```
Tests should verify user-visible behavior and important business rules.

---

## 15. Testing Before Implementation
For significant frontend features:

1. Inspect current implementation.
2. Define expected behavior.
3. Write/update tests.
4. Implement the feature.
5. Run tests.
6. Run TypeScript/type checks.
7. Run production build.
8. Review the diff.
Do not simply make the UI appear correct.

The implementation must be behaviorally tested.

---

## 16. Do Not Trust Frontend Permissions
Never implement security logic such as:

```
if (buttonHidden) {
    user is unauthorized
}
```
Hiding a button does not provide security.

The frontend may hide inaccessible actions for UX, but every protected operation must still be validated by the backend.

---

## 17. Error Handling
Frontend features must properly handle:

- loading
- success
- validation errors
- unauthorized responses
- forbidden responses
- not-found responses
- network errors
- server errors
Do not silently swallow API errors.

User-facing error messages should be understandable without exposing sensitive backend details.

---

## 18. No Invented Backend Contracts
Never invent:

- endpoint URLs
- request fields
- response fields
- role names
- module names
- billing rules
- permission rules
If something is unclear:

1. Inspect the backend.
2. Inspect existing frontend usage.
3. Search project documentation.
4. Only then ask for clarification if necessary.

---

## 19. Documentation
Important frontend architectural decisions must be documented under:

`doybiz-fe/docs/`

Recommended documentation:

```
docs/
├── COPILOT_INSTRUCTIONS.md
├── FRONTEND_ARCHITECTURE.md
├── TESTING_STRATEGY.md
└── PHASE_7_FRONTEND.md
```
Documentation should be updated when an architectural decision changes.

---

## 20. Change Discipline
For every implementation task:

### Before coding
Inspect.

### During coding
Make the smallest reasonable change.

### After coding
Run relevant tests.

Then run:

- TypeScript/type check
- lint if configured
- production build
- relevant automated tests
Do not modify unrelated files.

Do not perform large refactors unless explicitly requested.

---

## 21. Existing Work Must Be Preserved
The project already contains implemented functionality.

Do not:

- delete existing features because a new architecture is preferred
- replace existing authentication without inspection
- replace existing API utilities without justification
- recreate existing components
- rename large groups of files unnecessarily
- rewrite the application just to introduce Refine
- remove tests because they are inconvenient
- bypass existing backend contracts
When a new framework or library is introduced, integrate it incrementally.

---

## 22. Required Workflow for Copilot
Before implementing a major task, provide a short inspection summary containing:

1. Files inspected
2. Existing relevant implementation
3. Existing dependencies
4. Proposed files to create
5. Proposed files to modify
6. Testing approach
7. Potential compatibility risks
Then implement only after the architecture is understood.

After implementation, report:

1. Files created
2. Files modified
3. Tests added/updated
4. Commands executed
5. Test/build results
6. Remaining issues

---

## 23. Current Development Principle
The objective is not to build the frontend as quickly as possible.

The objective is to build a frontend that:

- follows the existing backend architecture
- preserves existing functionality
- has predictable authorization behavior
- is testable
- is maintainable
- avoids duplicated business logic
- integrates with Refine incrementally
- can safely evolve as the application grows
Always inspect first.

Always test important behavior.
