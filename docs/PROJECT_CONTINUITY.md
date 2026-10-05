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
