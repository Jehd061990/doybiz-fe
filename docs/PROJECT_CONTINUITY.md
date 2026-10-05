# DOYBIZ PROJECT CONTINUITY & CURRENT DEVELOPMENT STATUS

> **Purpose:** This document is the primary continuity/reference document for continuing DoyBiz development across ChatGPT/Copilot/Gemini sessions.
>
> **Last updated:** 2026-10-05
>
> **Important:** Before implementing a new feature, inspect the actual current code, backend/frontend contracts, tests, and existing documentation. **Do not rebuild existing functionality from scratch.** Preserve working behavior and extend the current architecture.

---

## 1. Project Identity

**Project:** DoyBiz  
**Goal:** Multi-tenant SaaS business management platform, initially focused on salons but designed so the architecture can later support other service businesses such as clinics and similar organizations.

### Repositories

- Frontend: `Jehd061990/doybiz-fe-dev`
- Backend: `Jehd061990/doybiz-be-dev`

### Local workspace

```text
C:\Users\User\Documents\PersonalProject\DoyBiz\doybiz
├── doybiz-fe
└── doybiz-be
```

### Frontend stack

- Next.js App Router
- React
- TypeScript
- Refine
- Jest
- React Testing Library
- Same-origin API calls through Next route handlers
- Backend URL is server-side through `DOYBIZ_API_URL`

### Backend stack

- Node.js
- Express
- TypeScript
- Mongoose
- MongoDB

---

# 2. Current Overall Status

The project already has substantial backend and frontend implementation. **Do not treat this as a greenfield project.**

Completed/implemented areas include:

- Organization/authentication
- Users
- Branches
- Customers
- Reservations
- POS
- Sales/payments
- Reports/dashboard foundations
- Public website/domain resolution
- Public booking flow
- Website CMS
- Subscription billing/Xendit foundations
- Frontend authentication/session
- Module-based authorization UX
- User role/module presets
- Website Section Builder
- Dedicated public booking page

The current work focus is the **Website/CMS**, especially making the website configuration flexible enough for tenant-specific public landing pages while preserving the existing booking/public-site architecture.

---

# 3. Most Recently Completed Work

## 3.1 Website Section Builder

The CMS now supports a configuration-driven Section Builder using these fixed section keys:

```text
HERO
SERVICES
BRANCHES
CONTACT
```

The website configuration stores:

```ts
sectionOrder: WebsiteSectionKey[];
```

Default order:

```text
HERO → SERVICES → BRANCHES → CONTACT
```

The CMS supports:

- Add section
- Remove section
- Reorder section
- Enable/disable section
- Edit section content
- Save Draft
- Preview Draft
- Publish
- Preserve section content when removed/re-added
- Preserve section content when disabled/re-enabled
- Hero remains mandatory

### Important design decision

The current implementation intentionally uses **fixed supported section types**, rather than allowing arbitrary React/component injection from the database.

This is safer and easier to maintain.

---

# 4. Hero Editor Duplication Was Fixed

Previously, Website CMS had two Hero editors:

1. An old standalone Hero section near Branding
2. Hero inside Section Builder

This was confusing and duplicated functionality.

### Current intended structure

```text
Website
├── Branding
├── Booking CTA
├── Section Builder
│   ├── 1. Hero
│   │   ├── Eyebrow
│   │   ├── Headline
│   │   ├── Description
│   │   ├── Booking card label
│   │   ├── Booking card title
│   │   ├── Hero image URL
│   │   └── Media Library
│   ├── 2. Services
│   ├── 3. Branches
│   └── 4. Contact
└── Footer
```

The old standalone Hero editor was removed.

The existing Media Library functionality was moved into the Hero editor so no functionality was lost.

---

# 5. Website Media Library

The CMS already has a media library used by the Hero editor.

Current functionality:

- Upload image
- Use uploaded image for Hero
- Delete image
- Store/use Hero image URL
- Loading state
- File size limit: 5 MB
- Supported formats:
  - JPEG
  - PNG
  - WebP

Backend media API already exists.

Do not replace this with another media system unless there is a clear architectural reason.

---

# 6. Draft vs Published Website Architecture

This is one of the most important parts of the current system.

The backend `WebsiteConfig` stores two configurations:

```text
draft
published
```

### CMS endpoints

```text
GET  /api/website
PUT  /api/website
POST /api/website/publish
```

### Meaning

```text
GET /website
    ↓
returns draft + published

PUT /website
    ↓
updates ONLY draft

POST /website/publish
    ↓
copies draft → published
```

The public site must never use the draft configuration in normal live mode.

---

# 7. Public Website Architecture

Live public site uses a different endpoint from the CMS.

```text
/site
  ↓
ClientLandingPage
  ↓
GET /api/public/site?tenant=onepiecesalon
  ↓
Next.js public API proxy
  ↓
DOYBIZ_API_URL/public/site
  ↓
backend public controller/service
  ↓
published website configuration
```

The backend public website service uses:

```ts
getPublicWebsiteConfig(organizationId)
```

which reads:

```text
published
```

not draft.

### Important lesson

Do not assume `/api/website` and `/api/public/site` are the same API.

They serve different purposes:

- `/api/website` = authenticated CMS editing
- `/api/public/site` = public live website

---

# 8. Recent Publish/Cache Issue and Fix

There was a real issue where the CMS preview showed updated configuration but the live public website did not immediately reflect all published section changes.

Investigation confirmed:

- CMS publishing uses `/website`
- Live public website uses `/public/site`
- Public endpoint reads `published`
- Frontend public route proxy had caching concerns
- The public proxy also had an incorrect Next import

The public route handler was corrected from:

```ts
import { NextRequest, NextResponse } from 'next';
```

to:

```ts
import { NextRequest, NextResponse } from 'next/server';
```

The public proxy also uses explicit no-cache response headers:

```text
Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate
Pragma: no-cache
Expires: 0
```

### Latest relevant commits

```text
323121b683f06e38366f32f43522b7feeb40664a
fix(public): import route handlers from next/server

ea8de3d617e7623b9d1c984445f06bbc17f13f4f
fix(public): prevent cached published website responses
```

---

# 9. Publish Flow Was Also Corrected

The frontend Publish action now explicitly saves the current local draft before calling the dedicated publish endpoint.

Current conceptual flow:

```text
User edits CMS
    ↓
local draft state
    ↓
Publish
    ↓
PUT /website
    ↓
POST /website/publish
    ↓
refetch CMS config
```

This prevents the Publish action from accidentally publishing stale backend draft data when the user has unsaved local edits.

Relevant commits:

```text
f5ff9c01ad8a8f1031e3edda6e57279fec882bcb
fix(website): publish the current draft state

c8a6091090ae468e5d556697be64c01f68dddaf9
test(website): verify publish uses current draft
```

---

# 10. Current Public Landing Page

Current development URL:

```text
http://localhost:3001/site?tenant=onepiecesalon
```

The public landing page is implemented in:

```text
src/components/public/client-landing-page.tsx
```

The component supports:

- Public tenant resolution
- Website configuration
- Branding
- Hero
- Services
- Branches
- Contact
- Footer
- Booking CTA
- Booking modal
- Dedicated booking page mode
- Draft preview

---

# 11. Dedicated Facebook Booking Page

A dedicated booking page was added for Facebook traffic.

Desired flow:

```text
Facebook Ad/Post
    ↓
Book Now CTA
    ↓
/site/book?tenant=onepiecesalon#top
    ↓
Booking form
    ↓
Schedule
    ↓
Customer details
    ↓
Confirmation
```

The dedicated booking page:

- Keeps the landing page top navigation visible
- Makes the booking form the main page content
- Reuses the existing booking state
- Reuses existing validation
- Reuses existing availability checking
- Reuses existing reservation API
- Reuses existing confirmation flow
- Does not require the visitor to open the homepage booking modal
- Allows navigation back to the landing page

The normal homepage Book Now modal remains available for normal visitors.

---

# 12. Website Booking CTA Modes

Website configuration supports:

```ts
bookingCta: {
  enabled: boolean;
  label: string;
  mode: 'modal' | 'page';
}
```

Meaning:

- `modal` → existing homepage booking modal
- `page` → dedicated `/site/book?tenant=...` booking page

This configuration should remain backward-compatible.

---

# 13. Current Website Configuration Contract

Backend `WebsiteConfigValue` currently contains:

```ts
{
  branding: {
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
  };

  hero: {
    eyebrow: string;
    title: string;
    description: string;
    cardLabel: string;
    cardTitle: string;
    backgroundImageUrl: string;
  };

  sectionOrder: WebsiteSectionKey[];

  bookingCta: {
    enabled: boolean;
    label: string;
    mode: 'modal' | 'page';
  };

  sections: {
    services: {
      enabled: boolean;
      eyebrow: string;
      title: string;
    };

    branches: {
      enabled: boolean;
      eyebrow: string;
      title: string;
    };

    contact: {
      enabled: boolean;
      eyebrow: string;
      title: string;
    };
  };

  footer: {
    poweredByText: string;
  };
}
```

---

# 14. Backend Website Normalization

Backend normalization is important.

The backend does not blindly trust frontend configuration.

It:

- Validates colors
- Limits text lengths
- Validates section keys
- Removes duplicate section keys
- Restores missing supported sections
- Normalizes Booking CTA mode
- Preserves existing content where appropriate

Current allowed section keys are:

```text
HERO
SERVICES
BRANCHES
CONTACT
```

Any future section type must be deliberately added to the backend registry/model and frontend renderer.

Do not simply add a frontend-only section.

---

# 15. Public Rendering Order

The frontend public renderer uses `sectionOrder`.

Conceptually:

```text
Header
    ↓
sectionOrder
    ↓
Hero / Services / Branches / Contact
    ↓
Footer
```

Each supported section checks:

1. Is its key present in `sectionOrder`?
2. Is its section enabled?

The booking-only page intentionally does not render the normal landing content sections because its primary purpose is the booking workflow.

---

# 16. Current Website CMS Tests

Website tests already cover important behavior including:

- CMS renders
- Draft editing
- Save Draft
- Publish
- Publish saves current draft first
- Section reorder
- Section removal
- Section addition
- Section enable/disable
- Content preservation
- Hero mandatory rule
- Hero single-editor rule
- Add Section area
- Save Draft error
- Stable selectors
- Preview behavior

Recent test-related commits include:

```text
27db3e7811d9e27530dd4754de2687b16882c2a7
test(website): assert single Hero editor in section builder

039a41809044954ba8a085be010eb9afb81dabbe
test(website): align headline selectors with hero editor

d12cb49092351d572f32c6bb276e346241a1f64f
test(website): cover section builder UX guardrails
```

---

# 17. Latest Verified Frontend Test/Build Status

The latest local verification reported by the developer:

```text
npm run typecheck
PASS

npm test -- --runInBand
Test Suites: 27 passed, 27 total
Tests:       116 passed, 116 total

npm run build
PASS
```

Build included:

```text
/api/public/[...path]
/site
/site/book
```

This status is based on the latest reported local run. When continuing development, run the checks again after making changes.

---

# 18. Current Frontend Architecture Rules

These rules must be preserved.

### API

Use the existing centralized same-origin API architecture.

Do not introduce random direct browser calls to `DOYBIZ_API_URL`.

### Authentication

The frontend session is cookie-backed.

Backend authorization remains the security boundary.

Frontend module/role checks are UX protection only.

### Tenant isolation

Organization/tenant scoping is owned by the backend.

Never trust a browser-supplied organization ID.

### Refine

Use the existing Refine provider/data-provider architecture.

Do not invent CRUD resources for backend endpoints that do not exist.

### Website CMS

Website CMS custom actions are appropriate because Save Draft and Publish are custom actions.

### Public website

Public website must consume the published configuration.

Draft preview must remain explicitly separated from live public mode.

---

# 19. Important Existing DoyBiz Business Rules

## Pricing

Current planned pricing:

- PHP 5,000 setup fee once
- PHP 1,499/month per active branch
- Organization-level user seats
- Each branch includes 3 users
- Additional users: PHP 200/month

## User/branch access

Owner can assign:

- Branch access
- Role
- Module permissions

Roles:

```text
OWNER
MANAGER
CASHIER
```

Owner accounts must not disappear or be downgraded away.

## Role presets

Manager and Cashier have presets, but manual module assignment remains available.

Current conceptual presets:

```text
MANAGER
POS
SALES
APPOINTMENTS
SERVICES
CUSTOMERS
REPORTS
STAFF

CASHIER
POS
SALES
APPOINTMENTS
CUSTOMERS
```

Presets are convenience defaults, not a replacement for explicit permissions.

---

# 20. Current Module Registry

Current backend/frontend module keys include:

```text
POS
SALES
APPOINTMENTS
SERVICES
CUSTOMERS
REPORTS
STAFF
BILLING
WEBSITE
```

There is currently no:

```text
INVENTORY
SUPER_ADMIN
```

unless deliberately added in a future phase.

---

# 21. Major Existing Backend Areas

The backend has progressed through multiple phases.

High-level implementation history:

```text
Phase 1
Organization + Authentication

Phase 2
Customers + Reservations

Phase 3
POS + Sales + Payments

Phase 4
Reports + Dashboard

Phase 5
Public Website + Domain Resolution + Public Booking

Phase 6
Subscription Billing + Xendit

Phase 7+
Frontend foundation and operational modules

Current focus
Website CMS / Section Builder / Public Website
```

Do not recreate these modules without inspecting their existing implementation.

---

# 22. Billing Architecture Reminder

Billing is prepaid-oriented.

Supported payment terms:

```text
1
3
6
12 months
```

Planned behavior includes:

- prepaid activation
- added branch charges
- added user charges
- proration
- pending activation until payment
- billingEffectiveAt
- billingActivationPending
- adjustment invoices
- Xendit webhook reconciliation

Relevant endpoint:

```text
/api/billing/xendit/webhook
```

Billing calculations belong to the backend.

Frontend should display backend-provided estimates rather than reproducing billing formulas.

---

# 23. Current Website Files Worth Inspecting First

### Frontend

```text
src/components/website-management-page.tsx
src/components/website-management-page.test.tsx
src/components/public/client-landing-page.tsx
src/components/public/navigation.ts
src/app/site/page.tsx
src/app/api/public/[...path]/route.ts
src/app/app/website/page.tsx
```

### Backend

```text
src/models/WebsiteConfig.ts
src/services/websiteService.ts
src/controllers/websiteController.ts
src/routes/websiteRoutes.ts
```

Also inspect public-site service/controller and tenant-resolution code before changing public website behavior.

---

# 24. Known Architectural Gaps / Future Work

These are known gaps, not reasons to rebuild the current system.

## Website CMS

Possible future improvements:

- More section types
- Better section-specific content editors
- SEO metadata
- Open Graph/social sharing metadata
- Favicon/site icon
- More media management
- Better preview experience
- More flexible page templates
- Additional public pages
- Custom navigation links
- Custom footer content
- Contact/social links
- Testimonials
- Gallery
- Promotions
- FAQs
- Team/staff showcase
- Service category presentation

Any new section must be added end-to-end:

```text
Backend type/registry
    ↓
Backend normalization/schema
    ↓
API contract
    ↓
Frontend CMS editor
    ↓
Frontend public renderer
    ↓
Tests
    ↓
Documentation
```

---

# 25. Recommended Next Development Direction

After confirming the current publish flow manually, the recommended next step is to continue improving the **Website CMS Section Builder**, not to rebuild the existing website.

Recommended order:

### Step 1 — Strengthen current Section Builder contract

Add/verify tests for:

- Reordering all four sections
- Published public order
- Disabled sections not rendering publicly
- Draft order remaining separate from published order
- Publish preserving all section content
- Publish preserving branding/CTA/footer
- Live public site consuming published config only

### Step 2 — Improve section editor UX

Make each section editor clearly expose:

- Section name
- Enabled/disabled state
- Drag/reorder controls
- Content fields
- Remove control where allowed
- Preview relationship

Hero remains mandatory.

### Step 3 — Add safe new section types

Good candidates:

```text
ABOUT
GALLERY
TESTIMONIALS
FAQ
PROMOTIONS
TEAM
```

Start with one section type at a time.

Do not create a generic arbitrary HTML editor yet.

### Step 4 — Add SEO configuration

Potential fields:

```text
pageTitle
metaDescription
ogImage
favicon
canonicalUrl
```

Keep this tenant-scoped and sanitized.

### Step 5 — Improve social/Facebook traffic experience

The dedicated booking page should remain optimized for:

```text
Facebook → Book Now → /site/book?tenant=...
```

Potential later additions:

- tracking/referrer metadata
- campaign parameters
- share preview metadata
- stronger mobile CTA
- branch/service preselection from campaign links

Do not break the existing booking flow.

---

# 26. Manual Verification Checklist Before Considering Website Work Complete

For every website CMS change:

### CMS

- [ ] Open `/app/website`
- [ ] Edit Hero
- [ ] Edit Services
- [ ] Edit Branches
- [ ] Edit Contact
- [ ] Reorder sections
- [ ] Disable a section
- [ ] Save Draft
- [ ] Preview Draft
- [ ] Publish

### Live site

Open:

```text
http://localhost:3001/site?tenant=onepiecesalon
```

Verify:

- [ ] Published Hero appears
- [ ] Published Services content appears
- [ ] Published Branches content appears
- [ ] Published Contact content appears
- [ ] Published order is correct
- [ ] Disabled section does not appear

### Booking

Open:

```text
http://localhost:3001/site/book?tenant=onepiecesalon#top
```

Verify:

- [ ] Navigation remains visible
- [ ] Booking form is main content
- [ ] Schedule selection works
- [ ] Availability checking works
- [ ] Customer details work
- [ ] Confirmation works
- [ ] Reservation API succeeds
- [ ] Back/cancel navigation works

---

# 27. Testing Commands

Frontend:

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

Recommended full verification:

```bash
npm run typecheck && npm test -- --runInBand && npm run build
```

Backend commands depend on the existing package scripts. Inspect `package.json` before assuming a phase test command.

---

# 28. Git Workflow

Before editing:

```bash
git pull
```

After changes:

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

Then commit with a focused message.

Avoid mixing unrelated features in one commit.

---

# 29. Continuity Instructions for a New Chat

If this document is provided to a new ChatGPT/Copilot/Gemini session, the assistant should:

1. Read this document first.
2. Read the existing architecture/testing/phase documentation.
3. Inspect the actual current repository files before making implementation decisions.
4. Inspect both frontend and backend contracts when a feature crosses the API boundary.
5. Identify what is already implemented.
6. Preserve existing working functionality.
7. Do not rebuild existing modules from scratch.
8. Do not invent backend endpoints.
9. Do not assume CMS and public-site endpoints are the same.
10. Keep draft and published website configurations separate.
11. Add tests with every meaningful implementation change.
12. Run typecheck/tests/build after changes.
13. Update this continuity document whenever a major feature/architecture decision is completed.
14. Record the latest commit SHA(s).
15. Record known issues and the next recommended task.

---

# 30. Latest Frontend Commit Chain Relevant to Website

Most recent relevant commits:

```text
323121b683f06e38366f32f43522b7feeb40664a
fix(public): import route handlers from next/server

ea8de3d617e7623b9d1c984445f06bbc17f13f4f
fix(public): prevent cached published website responses

039a41809044954ba8a085be010eb9afb81dabbe
test(website): align headline selectors with hero editor

27db3e7811d9e27530dd4754de2687b16882c2a7
test(website): assert single Hero editor in section builder

fcce4d17a918e98f32a2cb3ae8ccfa71ac079f57
fix(website): keep Hero editing inside section builder

c8a6091090ae468e5d556697be64c01f68dddaf9
test(website): verify publish uses current draft

f5ff9c01ad8a8f1031e3edda6e57279fec882bcb
fix(website): publish the current draft state
```

Latest known frontend HEAD:

```text
323121b683f06e38366f32f43522b7feeb40664a
```

---

# 31. Current Development Position

**Current position:**

```text
Core SaaS
   ↓
Operational modules
   ↓
Public website
   ↓
Booking
   ↓
Website CMS
   ↓
Section Builder
   ↓
Publish/live-site synchronization
   ↓
[CURRENT]
Improve CMS flexibility + public website capabilities
```

The current implementation is a working foundation.

The next work should focus on **incremental CMS/public-site enhancement**, with strong backend/frontend contract validation and regression tests.

---


---

# 33. Section Builder Publish Regression Coverage

After reviewing the current Section Builder implementation, an additional regression test was added to verify that the **Publish** action sends the complete edited draft state before calling the dedicated publish endpoint.

The new coverage verifies that one Publish operation preserves and sends together:

- section order
- section visibility/enabled state
- Services content
- Branches content
- Contact content
- branding
- booking CTA
- footer content

It also verifies that the dedicated publish action remains:

```text
PUT /website
    ↓
POST /website/publish
```

This closes an important frontend regression gap: previously the publish test only asserted the Hero headline, so a future change could accidentally omit another part of the website configuration while the test suite still passed.

### New commit

```text
ee31adbcf470a20db716e9f601743a2922e61013
test(website): cover complete publish payload
```

### Next verification

Run locally:

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

Then manually verify the published order/visibility on:

```text
/site?tenant=onepiecesalon
```

The next implementation milestone remains improving the Section Builder/public rendering contract before adding additional section types.

# 34. Publish Regression Test Selector Fix

The new complete-publish regression test initially failed because the Services card is expanded by default while Branches and Contact are collapsed by default. The failure was in the test setup, not the Section Builder implementation.

The test was corrected to explicitly expand:

- Branches via `Edit 3. Branches`
- Contact via `Edit 4. Contact`

before querying their title inputs. No application behavior was changed.

### Fix commit

```text
3c3820fe8b0485d1114961d040f199a4f6424923
test(website): expand collapsed sections before publish assertions
```

### Current verification status

The selector fix is committed. Full local verification still needs to be rerun after pulling the latest commit:

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

Do not mark the new publish regression as fully verified until those commands pass.


# 32. Final Rule

> **Inspect first. Extend second. Test third. Document fourth.**

DoyBiz already has substantial implementation. Never assume a feature is missing simply because it is not described in an older document. Always inspect the latest code and tests before implementing.


# 35. Landing Page Template System Phase 1

The Website CMS/public website was extended with the first version of a reusable landing-page template architecture.

## Goal

DoyBiz should support multiple landing-page designs in the future without duplicating the business data or booking implementation.

The design boundary is now:

```
Website Config / Business Content
            ↓
      Template Renderer
       /           \
   CLASSIC       future templates
            ↓
     Shared booking flow
```

## Backend contract

Added:

```ts
export type WebsiteTemplateKey = 'CLASSIC';
export const DEFAULT_WEBSITE_TEMPLATE = 'CLASSIC';
```

`WebsiteConfigValue` now contains:

```ts
template: WebsiteTemplateKey;
```

The Mongoose website value schema stores the template and currently permits `CLASSIC`.

Existing website records are migrated lazily by `getWebsiteConfig()` when the field is missing, preserving backward compatibility.

Template normalization currently defaults safely to `CLASSIC`.

Important backend files:

```
src/models/WebsiteConfig.ts
src/services/websiteService.ts
```

## Frontend renderer

Added:

```
src/components/public/website-renderer.tsx
```

The renderer currently contains:

- `WebsiteTemplateKey`
- shared website/public data types
- `WEBSITE_TEMPLATES` registry
- `ClassicTemplate`
- `WebsiteRenderer`

The existing public design was extracted into `ClassicTemplate`.

The booking state/API/availability/reservation workflow remains in `ClientLandingPage`, so templates do not own or duplicate booking logic.

Current rendering flow:

```
ClientLandingPage
    ↓
WebsiteRenderer
    ↓
ClassicTemplate
    ↓
existing public sections + navigation
    ↓
shared booking overlay/flow
```

This preserves the existing `/site` and `/site/book` behavior while creating a clean extension point for future designs.

## CMS template selector

`src/components/website-management-page.tsx` now exposes a Landing Page Template selector.

Current option:

```
Classic
Clean and professional layout for service businesses.
```

The selected template is part of the normal draft payload, so it follows the existing:

```
Save Draft
    ↓
PUT /website
    ↓
Publish
    ↓
POST /website/publish
```

architecture.

## Tests added

Added frontend coverage for:

- template selector rendering
- selected template persistence through Save Draft
- public page rendering through the Classic template renderer

Existing website publishing, Section Builder, booking, preview, and dedicated booking-page tests remain in place.

## Important design rule

Templates control **presentation/layout**.

Website configuration continues to control **business content**.

Booking remains a shared workflow.

Therefore changing a future template should not require changing:

- services
- branches
- staff
- availability
- reservations
- customer details
- booking API

## Current template registry

Only one template is intentionally registered:

```
CLASSIC
```

The next template should be added only after the current architecture is locally verified.

Recommended next milestone:

```
MODERN_LUXURY
```

with a genuinely different visual layout while consuming the same WebsiteConfig and booking system.

## Verification status

The implementation has been committed to GitHub, but the local frontend/backend typecheck, test suite, and production build still need to be run after pulling the latest changes.

Do not mark this milestone fully verified until:

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

all pass.

## Relevant commits

Frontend:

```
c363244cc8e078d839e0935df86645d756bc2789
feat(website): add template renderer foundation

604274e9d2eead2c4dbcd6f83040399627498a34
refactor(website): route landing page through template renderer

c5c73fc405da8fb8a92ca322655e3ebd2ac343c6
feat(website): add landing template selector

02fde613e0c8aaf88ef0b854760d8ee6a6e50a21
test(website): cover template selector

f12e587149cdac6c32b2f75fd0891f3c0be750fa
test(website): cover template renderer
```

Backend:

```
630a49b46c3f8c77498136b6fa2397e651cbeba5
feat(website): add landing page template contract

f292bd0c53ed6f5c274782e9e5fabfd00fb6e45f
feat(website): normalize and migrate landing templates
```

## Next step

Pull the latest frontend and backend changes locally and run the full verification commands.

After that, manually confirm:

1. Existing Classic landing page looks unchanged.
2. Website CMS shows the template selector.
3. Save Draft preserves the selected template.
4. Publish preserves the selected template.
5. `/site?tenant=onepiecesalon` still renders correctly.
6. `/site/book?tenant=onepiecesalon` still works.
7. Booking flow and availability are unaffected.

Only after this passes should we build the first genuinely different `MODERN_LUXURY` template.


# 36. Landing Template TypeScript CSS Variable Fix

The first local verification after pulling the Landing Page Template System exposed a frontend typecheck/build issue in `ClientLandingPage`.

## Issue

The existing landing page applies custom CSS variables through the React `style` prop:

```text
--site-primary
--site-accent
--site-background
--site-text
```

The current React TypeScript definitions do not accept arbitrary CSS custom-property keys directly on `CSSProperties`, causing:

```text
TS2353: Object literal may only specify known properties, and '--site-primary' does not exist in type 'Properties<...>'
```

The Jest suite still passed, but typecheck and production build failed during their type-check phase.

## Fix

`src/components/public/client-landing-page.tsx` now:

- imports the React `CSSProperties` type
- creates the landing page style object once
- explicitly treats that object as `CSSProperties`
- preserves the existing CSS custom-property values and flex layout behavior

No visual behavior or website configuration contract was changed.

## Commit

```text
51bf7e0cb7d8a3211ad0554ebfba1b51418c69da
fix(website): type custom landing page css variables
```

## Verification status

After pulling this fix, rerun:

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

The previously reported state was:

```text
typecheck: FAILED
tests: 27 suites / 119 tests PASSED
build: FAILED during typecheck
```

Do not mark the Template System Phase 1 milestone fully verified until all three commands pass.

## Next step

If verification passes, manually check the Classic template on:

```text
/site?tenant=onepiecesalon
/site/book?tenant=onepiecesalon
```

Then proceed to the first genuinely different `MODERN_LUXURY` template.

# 37. Landing Page Template System Phase 1 — Fully Verified

The developer completed the post-fix local verification and manually checked the resulting website output.

## Automated verification

All required frontend checks passed after the CSS variable typing fix:

```text
npm run typecheck
PASS

npm test -- --runInBand
PASS
27 test suites passed
119 tests passed

npm run build
PASS
```

The earlier TypeScript error for the custom landing-page CSS variables is therefore resolved.

## Manual verification

The developer also checked the rendered output after the changes. The Classic landing page/template behavior and the dedicated booking-page output were confirmed working.

Verified areas include:
- `/app/website`
- Classic template selection
- `/site?tenant=onepiecesalon`
- `/site/book?tenant=onepiecesalon`
- landing-page navigation
- booking page presentation
- existing booking flow/output

## Milestone status

**Landing Page Template System Phase 1 is now fully verified.**

The architecture is ready for the next template implementation:

```text
Website Config
    ↓
WebsiteRenderer
    ↓
CLASSIC
    ↓
shared public/booking behavior

Next:
WebsiteRenderer
    ↓
MODERN_LUXURY
```

The next implementation should add a genuinely different visual template while continuing to consume the same WebsiteConfig, public data, and shared booking workflow.

## Relevant commit

```text
51bf7e0cb7d8a3211ad0554ebfba1b51418c69da
fix(website): type custom landing page css variables
```

## Next recommended task

Proceed to **MODERN_LUXURY**.

Before implementation, inspect the current Classic renderer and CMS template selector, then extend the existing template registry/renderer architecture without duplicating:
- website business data
- booking state
- availability logic
- reservation API
- customer details flow
- public tenant resolution


# 38. Modern Luxury Landing Page Template — Implementation Started

The first genuinely different public landing-page template was added on top of the verified template renderer architecture.

## Goal

Add a premium/editorial landing-page option without duplicating the existing website business data or booking implementation.

## Backend

Expanded the website template contract from:

`CLASSIC`

to:

`CLASSIC | MODERN_LUXURY`

The Mongoose schema now accepts both templates.

Template normalization now accepts either supported template and falls back to the current draft template for unknown values.

Relevant backend files:

```
src/models/WebsiteConfig.ts
src/services/websiteService.ts
```

Commits:

```
fcd40857d6ffe029f48ed9a2ff26ea020e150fc6
feat(website): add modern luxury template contract

e2f0e487efa2b2829fff1cac0b8e7a54fe3653f9
feat(website): normalize modern luxury template
```

## Frontend

Added `MODERN_LUXURY` to the existing template registry and renderer.

The new template provides a genuinely different presentation:

- Editorial/luxury hero
- Large image-led hero treatment
- Premium typography hierarchy
- Dark location section
- Two-column service presentation
- Minimal navigation
- Elevated CTA treatment
- Premium contact/footer presentation
- Responsive mobile layout

It continues to consume the same:

- organization
- branding
- hero content
- services
- branches
- contact content
- booking CTA
- section order
- booking modal/page behavior
- shared availability/booking workflow

Important architecture rule remains:

```
Template = presentation
WebsiteConfig = business content
ClientLandingPage = shared booking/state/API logic
```

Relevant frontend files:

```
src/components/public/website-renderer.tsx
src/components/public/client-landing-page.module.css
src/components/website-management-page.tsx
```

The CMS template selector automatically exposes the new template through the existing `WEBSITE_TEMPLATES` registry.

Frontend commits:

```
4e5fda1a0c353f640a18deb9e74a9fa432750d30
feat(website): add modern luxury landing template

42a130256cc5a4b1252662061b1f529e53dd81fa
feat(website): style modern luxury landing template
```

## Regression coverage

Added frontend coverage for:

- selecting Modern Luxury in the CMS
- saving the selected template
- rendering the Modern Luxury public template
- preserving the shared booking CTA/modal behavior

Test commits:

```
b75fa4bbf56cf57b7b6cb3be28dbda12c15c0189
test(website): cover modern luxury template selection

29cd83e413638d2f0a25c83a534072bf6b825b58
test(website): cover modern luxury template rendering
```

## Verification status

Implementation is committed, but **not yet marked fully verified**.

Run after pulling the latest frontend and backend changes:

Frontend:
```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

Backend:
```bash
npm run typecheck
npm run build
```

If the backend test environment is available, also run the existing integration/phase tests as appropriate.

Then manually verify:

```
/app/website
/site?tenant=onepiecesalon
/site/book?tenant=onepiecesalon
```

Specifically confirm:

- Modern Luxury can be selected
- Save Draft preserves it
- Publish preserves it
- live public site renders the Modern Luxury design
- section order/visibility still work
- booking modal still works
- dedicated booking page still works
- availability and reservation flow are unchanged

Do not remove or alter the Classic template while verifying Modern Luxury.

## Next step

Run the full verification commands. If green, manually inspect the Modern Luxury visual output and then refine only any visual/UX issues discovered.



# 39. Modern Luxury Template Persistence Fix — Critical Regression

During manual verification, the Modern Luxury template could be selected in the Website CMS, but after **Save Draft** or **Preview Draft** the CMS radio selection reverted to Classic. The preview and live public website also rendered Classic.

## Root cause

Two frontend normalization functions were still using the Phase 1 placeholder behavior that converted every non-Classic template back to Classic:

1. `src/components/website-management-page.tsx`

The CMS draft clone contained:

```ts
template: cloned.template === 'CLASSIC' ? 'CLASSIC' : 'CLASSIC'
```

This meant a persisted `MODERN_LUXURY` draft was converted back to `CLASSIC` whenever the CMS reloaded/refetched the draft.

2. `src/components/public/client-landing-page.tsx`

The public website normalizer contained the same behavior:

```ts
template: website.template === 'CLASSIC' ? 'CLASSIC' : 'CLASSIC'
```

Therefore even when the backend returned `MODERN_LUXURY`, the public renderer received `CLASSIC`.

## Fix

Both normalizers now explicitly preserve the supported Modern Luxury key:

```ts
template: cloned.template === 'MODERN_LUXURY' ? 'MODERN_LUXURY' : 'CLASSIC'
```

and:

```ts
template: website.template === 'MODERN_LUXURY' ? 'MODERN_LUXURY' : 'CLASSIC'
```

This keeps backward compatibility by treating unknown values as Classic while preserving the newly supported Modern Luxury value.

## Regression tests added

Added coverage to:

```
src/components/public/client-landing-page.test.tsx
src/components/website-management-page.test.tsx
```

The public template test now verifies that the Modern Luxury-specific renderer output (`.luxuryShell`) is actually rendered, not merely the same shared content.

The CMS test verifies that a persisted `MODERN_LUXURY` draft is restored with the Modern Luxury radio selected.

## Commits

```
c70c5561d7d867a0e9aba39d8c6bc3a9ec3b266a
fix(website): preserve selected landing template on public site

8f2b1e5c4ea573d0bced5918a6b99aac2a1b5803
fix(website): preserve template selection in CMS draft

330e8f3d7dac1b6b1ed6381f64fa7a32fcbdfd9b
test(website): verify modern luxury template is rendered

c082867eb9f4aa2e39496996bc158b756669c46b
test(website): preserve modern luxury draft selection
```

## Verification status

The user previously confirmed:

```
npm run typecheck
PASS

npm test -- --runInBand
PASS
27 suites / 120 tests

npm run build
PASS
```

Those results were from before the persistence regression fix. The new commits therefore require a fresh local verification run.

## Required verification

After pulling the latest frontend:

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

Then manually verify the complete persistence path:

1. Select **Modern Luxury** in `/app/website`.
2. Click **Save Draft**.
3. Confirm the radio remains **Modern Luxury** after the CMS refresh.
4. Click **Preview draft** and confirm the preview renders the Modern Luxury visual layout.
5. Click **Publish**.
6. Open `/site?tenant=onepiecesalon`.
7. Confirm the live website renders Modern Luxury.
8. Open `/site/book?tenant=onepiecesalon` and confirm booking still works.
9. Switch back to Classic and confirm Classic still renders correctly.

## Known non-blocking test warning

The existing `ClientLandingPage` Jest tests may print React `act(...)` warnings from asynchronous staff/availability state updates. These do not currently fail the suite, but they should be cleaned up in a later test-maintenance task without changing production booking behavior.

## Next recommended task

Complete the fresh automated and manual verification above. If all checks pass, mark Modern Luxury as fully verified and record the final verification commit in this continuity document.

Rule remains:

**Inspect first. Extend second. Test third. Document fourth.**

---

# 16. Modern Luxury Template — Fully Verified

The Modern Luxury landing page template is now fully verified across the complete CMS lifecycle.

### Verified flow

```text
/app/website
    ↓
Select Modern Luxury
    ↓
Save Draft
    ↓
Preview Draft
    ↓
Publish
    ↓
/site?tenant=onepiecesalon
    ↓
/site/book?tenant=onepiecesalon
```

Manual verification confirmed:

- Modern Luxury can be selected in Website CMS.
- Save Draft preserves `MODERN_LUXURY`.
- Reloading the CMS preserves the selected template.
- Preview Draft renders the Modern Luxury layout.
- Publish preserves and publishes the Modern Luxury configuration.
- Live public website renders Modern Luxury.
- Dedicated booking page continues to work.
- Existing Classic template remains available.

### Root cause discovered during final verification

The first manual persistence test showed:

- Preview Draft → Modern Luxury
- Save Draft → Classic
- Publish → Classic

The backend GitHub implementation already supported `MODERN_LUXURY`, but the locally running backend had not yet been pulled/restarted with the latest backend template-normalization commits.

After updating the backend and restarting it, Save Draft and Publish correctly preserved `MODERN_LUXURY`.

This reinforces the project verification rule:

> When a frontend configuration works in local preview but not after persistence, verify the running backend version and restart state before changing working frontend code.

### Test maintenance

The Modern Luxury public rendering test was tightened to wait for the asynchronous availability request after opening the booking modal, addressing the React `act(...)` warning caused by asynchronous staff/availability state updates during that test.

### Final automated verification

Frontend verification completed successfully:

```text
npm run typecheck
PASS

npm test -- --runInBand
PASS
27 suites / 121 tests

npm run build
PASS
```

### Relevant implementation

Frontend:

```text
src/components/public/website-renderer.tsx
src/components/public/client-landing-page.tsx
src/components/public/client-landing-page.test.tsx
src/components/website-management-page.tsx
src/components/website-management-page.test.tsx
src/components/public/client-landing-page.module.css
```

Backend:

```text
src/models/WebsiteConfig.ts
src/services/websiteService.ts
```

### Important commits

```text
fcd40857d6ffe029f48ed9a2ff26ea020e150fc6
feat(website): add modern luxury template contract

e2f0e487efa2b2829fff1cac0b8e7a54fe3653f9
feat(website): normalize modern luxury template

4e5fda1a0c353f640a18deb9e74a9fa432750d30
feat(website): add modern luxury landing template

42a130256cc5a4b1252662061b1f529e53dd81fa
feat(website): style modern luxury landing template

c70c5561d7d867a0e9aba39d8c6bc3a9ec3b266a
fix(website): preserve selected landing template on public site

8f2b1e5c4ea573d0bced5918a6b99aac2a1b5803
fix(website): preserve template selection in CMS draft

330e8f3d7dac1b6b1ed6381f64fa7a32fcbdfd9b
test(website): verify modern luxury template is rendered

c082867eb9f4aa2e39496996bc158b756669c46b
test(website): preserve modern luxury draft selection

abec39d7f6f66df3b5e037fce439a638e1d66624
test(website): await modern luxury booking availability
```

### Status

**Modern Luxury template: VERIFIED**

Do not rebuild the template architecture. The current shared model remains:

```text
WebsiteConfig
    ↓
WebsiteRenderer
    ├── ClassicTemplate
    └── ModernLuxuryTemplate
    ↓
shared booking flow
```

The next recommended task is to improve the CMS template-selection UX and add a safe visual template-preview experience before adding more landing-page templates.

Rule remains:

**Inspect first. Extend second. Test third. Document fourth.**
---

# 17. Website Template Selector UX — Visual Selection and Safe Preview

The Website CMS template selector was upgraded from plain radio fields into visual template cards.

### Current UX

Each available template now shows:

- Visual style preview card
- Template name
- Description
- Selected state
- **Use this template** radio control
- **Preview template** action

Selecting a card still only changes the local draft. It does not save or publish automatically.

### Safe template preview

The new **Preview template** action creates a temporary preview copy using the selected template key and stores it in:

`doybiz:website-preview-draft`

It then opens the existing draft preview route.

This means an owner can preview Classic or Modern Luxury without changing the saved draft or published website.

The existing **Preview draft** action remains unchanged and continues to preview the current draft.

### Architecture preserved

No separate template configuration was introduced.

The CMS still uses:

`WebsiteConfig → template + shared content → WebsiteRenderer`

Template-specific presentation remains separate from shared:

- services
- branches
- contact information
- branding
- booking CTA
- booking state
- availability
- reservation submission

### Responsive behavior

The template cards use a two-column layout on larger screens and collapse to one column on smaller screens.

### Regression coverage

Updated:

`src/components/website-management-page.test.tsx`

The CMS test now verifies that:

- Modern Luxury can be selected.
- The template preview action stores `MODERN_LUXURY` in the draft preview payload.
- The existing preview route is opened.
- The saved draft is not replaced by the preview-only template change.

### Implementation files

`src/components/website-management-page.tsx`

`src/components/website-management-page.test.tsx`

`src/app/globals.css`

### Commits

`34ffda5f22f0182ab0cdebcb7f1b529dbb0ed52c`
`feat(website): improve template selector and previews`

`6873f06818b7b76e603486cf3a8857540f8441d5`
`feat(website): style visual template selector`

`ca7e8764904fb650b2efd923b72a4ae9723c468f`
`test(website): cover template preview action`

### Next recommended task

Run the full frontend verification suite and manually verify:

1. Template cards render correctly.
2. Selecting Modern Luxury marks it selected but does not publish.
3. Preview template shows Modern Luxury without changing the saved draft.
4. Save Draft still persists the selected template.
5. Publish still works.
6. Existing Classic and Modern Luxury live pages remain unchanged.

After this verification, the next Website CMS improvement should be template-specific customization controls or a third landing template, depending on product priorities.

Rule remains:

**Inspect first. Extend second. Test third. Document fourth.**

# 18. Website Template Selector Test/TypeScript Fix

The first verification of the visual template selector exposed two implementation/test compatibility issues.

## Issues found

### 1. Preview Draft passed the click event into preview state

The shared preview function now accepts an optional template key:

`previewDraft(template?: WebsiteTemplateKey)`

The existing top-level **Preview draft** button was still using:

`onClick={previewDraft}`

React therefore passed a `MouseEvent` as the template argument. This caused:

- TypeScript `MouseEvent` vs `WebsiteTemplateKey` incompatibility.
- `JSON.stringify()` circular-reference failure when the event object was written to localStorage.
- The existing preview-draft regression test to fail.

## Fix

The button now explicitly invokes the function without arguments:

`onClick={() => previewDraft()}`

Template-specific preview buttons continue to use:

`onClick={() => previewDraft(key)}`

This keeps the preview API type-safe and preserves the safe temporary-template-preview behavior.

### 2. Template radio accessible names changed with the visual-card UI

The new visual selector has two radio inputs whose visible label is:

`Use this template`

The template name is displayed in the surrounding card/button, not as the radio's accessible name.

Existing tests were still querying:

- radio named `Classic`
- radio named `Modern Luxury`

Those queries no longer matched the actual accessible DOM.

## Test fix

`src/components/website-management-page.test.tsx` now queries the two template radios using:

`getAllByRole('radio', { name: 'Use this template' })`

and treats:

- index 0 = Classic
- index 1 = Modern Luxury

The test still verifies the selected state, Modern Luxury preview payload, preview route, and Save Draft persistence.

## Implementation files

`src/components/website-management-page.tsx`

`src/components/website-management-page.test.tsx`

## Commits

`429289912218a122df454d11493471459f77cc36`
`fix(website): pass explicit preview callback`

`ceb5b4c6ce4d6c106b567e07ec1f727204e585e5`
`test(website): align template selector accessibility queries`

## Verification status

The fixes are committed to `main`.

GitHub did not report workflow runs for the latest test-fix commit, so the local verification commands still need to be run before this milestone is marked fully verified.

Required:

```bash
npm run typecheck
npm test -- --runInBand
npm run build
```

Then manually verify the visual template selector and both preview paths.

**Inspect first. Extend second. Test third. Document fourth.**

## 19. Template Customization Foundation

### Completed

The website template architecture now supports **template-specific presentation settings** without creating separate website content models for each template.

Shared website content remains unchanged:
- hero content
- services
- branches
- contact
- booking CTA
- section order
- branding
- footer
- booking engine/API/state

Template presentation is now represented by `template` + `templateSettings`.

### Template settings

**Classic**
- Hero alignment: left / centered
- Navigation style: standard / minimal
- Section spacing: comfortable / compact
- Hero image position: center / top / bottom
- CTA style: solid / outline

**Modern Luxury**
- Hero composition: full bleed / split
- Navigation style: editorial / minimal
- Section spacing: airy / compact
- Image treatment: natural / cinematic
- Hero overlay: soft / strong
- Hero badge visibility

These settings are stored in the same WebsiteConfig draft/published object, so switching templates does not duplicate or discard business content.

### Backend changes

Files:
- `doybiz-be-dev/src/models/WebsiteConfig.ts`
- `doybiz-be-dev/src/services/websiteService.ts`
- `doybiz-be-dev/src/testPhase5.ts`

Changes:
- Added `WebsiteTemplateSettings`
- Added `DEFAULT_WEBSITE_TEMPLATE_SETTINGS`
- Added nested Mongoose schema for template settings
- Added normalization for all template setting values
- Added backward-compatible migration for existing website configs
- Existing configs receive safe defaults instead of requiring manual migration
- Phase 5 public-site test now verifies the default template settings contract

Backend commits:
- `fea922c845937464cb30342bc1cde98a21947ba3` — add template customization settings foundation
- `073453f788cb4431c111da9cf84e8f779614b592` — normalize and migrate template settings
- `10871a148ff16831212699d4e67da64e542ea756` — verify default template customization settings

### Frontend changes

Files:
- `src/components/website-management-page.tsx`
- `src/components/public/website-renderer.tsx`
- `src/components/public/client-landing-page.module.css`
- `src/components/website-management-page.test.tsx`

Changes:
- Added Template Settings CMS section below the template selector
- Settings shown are specific to the currently selected template
- Changes remain local until Save Draft
- Preview Draft includes the current template settings without saving/publishing
- Classic and Modern Luxury renderers consume the shared template settings
- Added presentation variants for navigation, spacing, hero alignment/image positioning, CTA style, luxury composition, overlay strength, and hero badge visibility
- Existing booking flow remains shared and unchanged
- Existing template selector and safe preview behavior remain intact

Frontend commits:
- `a246219c771cc9ce4069587e4d8619369e4d03e6` — add template settings controls to CMS
- `9d4e21d6c64fa6008333f6bf2fe62467ad5684de` — wire template settings into public renderer
- `72113e2bc6425459cbdf42ebde3fa17b89a6c3e3` — style template customization variants
- `d2e5f45f6a75f18223e9c238630fb2d2a9f6fce2` — cover template customization persistence
- `c6660f4392da2b0767de8709a42336d3cdfc9164` — keep image treatment isolated from hero content
- `473c95979ab2ca224fef7fe45461b9cc280b7c7a` — remove unused template image variable

### Important architecture rule

Do not introduce `classicHero`, `luxuryHero`, or separate template content models.

The intended architecture remains:

`WebsiteConfig`
→ `template`
→ `templateSettings`
→ `WebsiteRenderer`
→ selected template
→ shared booking engine

Template settings control presentation only; business data remains shared.

### Verification status

Automated tests were added for:
- Modern Luxury settings editing
- local draft preview containing the selected settings
- Save Draft payload containing the selected settings
- backend default settings contract

GitHub connector access does not execute the project's local npm scripts, so local verification should be run after pulling both repos:

```bash
# Frontend
git pull
npm run typecheck
npm test -- --runInBand
npm run build

# Backend
git pull
npm run build
npm run test:phase5
```

### Next recommended task

Manually verify both templates in the CMS and public site:
1. Select Classic and change its template settings.
2. Preview Draft without saving.
3. Confirm the preview changes visually.
4. Save Draft and reload CMS.
5. Publish and confirm live site.
6. Repeat for Modern Luxury.
7. Verify `/site/book` and booking flow remain unchanged.

After this foundation is stable, proceed to **Facebook/mobile booking-page optimization**, then add a genuinely different third template.

**Inspect first. Extend second. Test third. Document fourth.**

## 20. Template Customization Foundation — Renderer Completion Check

The current repository was re-inspected before extending the template customization work.

### Inspection result

The CMS and backend already persist and normalize templateSettings for both templates.

Confirmed backend:
- WebsiteConfig.ts defines the full WebsiteTemplateSettings contract and Mongoose enums/defaults.
- websiteService.ts normalizes template settings and backfills missing settings for older website configs.
- getPublicWebsiteConfig() exposes the published settings.
- Phase 5 coverage verifies the default template-settings contract.

Confirmed frontend:
- WebsiteManagementPage loads, edits, previews, and saves template settings.
- WebsiteRenderer consumes Classic and Modern Luxury settings.
- Existing booking flow remains outside the renderer and is still shared.

### Gap found during inspection

Modern Luxury had a persisted imageTreatment setting (natural | cinematic), but the public renderer did not actually apply that setting. The CMS could save the value, but changing it did not change the rendered hero image presentation.

### Fix

The Modern Luxury renderer now maps imageTreatment: cinematic to a dedicated luxuryCinematic presentation class.

The stylesheet applies a restrained saturation/contrast treatment so the setting has an observable public-site effect without changing the underlying hero image content.

### Commits

- ae1e75461afb01ec450c911997a64ab6b0974ebb — fix(website): apply modern luxury image treatment
- 23f59b99dbbd2b189acc16c2a953f4eed1d3d250 — feat(website): style modern luxury cinematic imagery
- 8aa1d0400274f55c44b9c75924301dae5822437e — test(website): cover modern luxury presentation settings
- bac60f01b38f9837185ee903b737c664b894ff2a — test(website): verify modern luxury image treatment
- 148b8d69b6aa3e6c6819f9c925681880b42e0ecd — fix(test): keep template settings fixture compatible

### Verification status

Repository inspection is complete and the renderer gap has been fixed.

Local npm verification still needs to be run from the frontend repository:

    npm run typecheck
    npm test -- --runInBand
    npm run build

Backend verification should also be run after pulling the current backend repository:

    npm run build
    npm run test:phase5

Manual CMS/public verification should confirm:
1. Modern Luxury → Image treatment → Cinematic changes the public hero presentation.
2. Natural restores the default image treatment.
3. Save Draft persists the selection.
4. Preview Draft reflects the selection without publishing.
5. Publish carries the setting to the live website.
6. /site/book and the shared booking flow remain unchanged.

No third template should be added until this customization foundation is locally verified.

Rule remains:

Inspect first. Extend second. Test third. Document fourth.

### #21 Modern Luxury cinematic treatment visibility fix (2026-10-06)
- User manually noticed that Modern Luxury `Natural` and `Cinematic` looked effectively identical in Preview.
- Inspection confirmed the earlier implementation applied `filter` to the entire `.luxuryHeroImage` container, which also contains hero text, badge, and CTA, making the image-treatment distinction weak and semantically incorrect.
- Fixed by separating the hero background image into a dedicated `.luxuryHeroMedia` layer.
- `Natural`: normal image rendering.
- `Cinematic`: visibly stronger treatment using lower saturation, higher contrast, lower brightness, a subtle zoom, and inset vignette.
- Updated the renderer, CSS, and regression test.
- Commits:
  - `bbe2b464b1c51f4987cdb837b77c249f88086a92` — `fix(website): make luxury cinematic treatment visible`
  - `57ad716da6b55bae86c3be336fdb52e7bd9b7d18` — `style(website): strengthen luxury cinematic image treatment`
  - `cff13e40b2e2d2d67d13037909a147de608cc59d` — `test(website): target luxury hero media treatment`
- Local verification still required:
  1. `git pull`
  2. `npm run typecheck`
  3. `npm test -- --runInBand`
  4. `npm run build`
  5. Preview Modern Luxury with Natural, then Cinematic, and confirm the hero image visibly changes while text/CTA remain unaffected.

## 21. Modern Luxury Cinematic Verification Fixture Fix

After local verification of commit `22a41ba`, frontend typecheck/build exposed a test fixture typing issue and the Modern Luxury presentation-settings test could not find `.luxuryHeroMedia` because the fixture supplied an empty hero background image URL. The renderer correctly creates the dedicated media layer only when a hero image URL exists.

Fixed in commit `d4e460095ef464e19308d9841162fd3a35a9f079`:
- Made the test fixture preserve `templateSettings` as an optional field instead of referencing a property that does not exist on the inferred base fixture type.
- Added an explicit `heroBackgroundImageUrl` test option for image-treatment coverage.
- The Cinematic test now exercises the actual `.luxuryHeroMedia.luxuryCinematic` rendering path.

Local verification should be rerun after pulling this commit:
- `npm run typecheck`
- `npm test -- --runInBand`
- `npm run build`


## 22. Template Settings Save Persistence + Cinematic Contrast Fix

User verification found two issues in the template customization foundation:

- Modern Luxury **Natural** and **Cinematic** still looked too similar in the public hero.
- Editing Template Settings and clicking **Save Draft** caused the fields to return to their default values after the CMS refetched the saved configuration.

Fixes:

- Frontend CMS now uses the saved draft returned by `PUT /website` immediately instead of relying on a follow-up refetch to restore the form state.
- Backend `updateWebsiteDraft()` now explicitly sets and marks the full `draft` subdocument as modified before saving, making template-settings persistence explicit.
- Modern Luxury cinematic treatment was strengthened with lower brightness/saturation, higher contrast, stronger image zoom, and a stronger inset vignette so it is visually distinguishable from Natural.

Verification still required locally:

```bash
git pull
npm run typecheck
npm test -- --runInBand
npm run build
```

Then manually verify:

1. Select Modern Luxury.
2. Change several Template Settings fields, including Image treatment → Cinematic.
3. Click Save Draft.
4. Confirm the fields remain unchanged after save.
5. Reload the Website CMS and confirm the saved values remain.
6. Preview Draft and compare Natural vs Cinematic using a real hero image.
7. Publish and confirm the live site preserves the selected settings.
8. Confirm `/site/book` and the shared booking flow remain unchanged.

## 22. Template Settings Save-State and Cinematic Presentation Hardening

The template customization flow had two remaining UX issues during manual verification:

- After Save Draft, the Template Settings controls could visually fall back to default values because the Refine mutation/query lifecycle could refresh the editor from an older/default server snapshot.
- Modern Luxury "Cinematic" could be technically active but visually too subtle compared with Natural.

Fixes:
- WebsiteManagementPage.saveDraft() now snapshots the exact local draft, sends that snapshot to PUT /website, and restores that same snapshot into editor state after a successful save instead of replacing it with the mutation response/refetched query.
- Added regression assertions that Hero composition, Image treatment, and Show hero badge remain selected after Save Draft.
- Strengthened the Cinematic hero treatment with stronger desaturation, contrast, brightness reduction, scale, vignette, and layered dark gradient treatment.
- Added a renderer regression assertion that the cinematic hero media uses the expected image and luxuryCinematic class.

Commits:
- 50fdc1dad3b045cc4a55e0a3c7a8401262322d74 — fix(website): keep saved template settings in editor
- cdbc6446aeac07de56710387ebf36e53618b707d — test(website): verify template settings stay after save
- 6cfe2f700273163e42996ff7e5c36e870aa52a4d — fix(website): make cinematic hero treatment visibly distinct
- 03d2eebdd426b15cef616c56c9924785309b8cc7 — test(website): verify cinematic hero media is active

Local verification required before considering this milestone complete:
1. Pull the latest frontend commits.
2. Run typecheck, tests, and production build.
3. In Website CMS, set Modern Luxury settings to non-default values, Save Draft, and confirm the controls remain unchanged.
4. Reload the CMS and confirm the saved values remain.
5. Compare Natural vs Cinematic with an actual hero image; Cinematic should now be visibly darker, more desaturated, higher-contrast, and vignetted.
6. Preview Draft and live publish should preserve the same template settings.