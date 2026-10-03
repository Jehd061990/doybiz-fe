# Phase 18 — Website CMS Frontend

## Status

IMPLEMENTED FOUNDATION. The Website CMS editor is connected to the backend WebsiteConfig draft/published contract. The current implementation also includes booking CTA configuration, draft preview, and a Hero Media Library.

## Purpose

Allow an organization owner/user with the `WEBSITE` module permission to manage the public landing-page configuration without changing the existing booking system.

## Route

- `/app/website` — protected Website CMS editor.

## Backend contract used

- `GET /api/website` — returns tenant-scoped draft and published website configuration.
- `PUT /api/website` — saves the editable draft.
- `POST /api/website/publish` — publishes the current draft.

The frontend reaches these endpoints through the existing same-origin backend proxy and Refine custom hooks.

## Current editable fields

- Branding: primary, accent, background, and text colors.
- Hero: eyebrow, headline, description, booking card label/title, background image URL.
- Booking CTA: enabled/disabled, label, and modal vs dedicated booking-page behavior.
- Sections: Services, Branches, and Contact visibility plus eyebrow/title.
- Footer: powered-by text.
- Hero Media Library: JPG/PNG/WebP upload up to 5 MB, organization-scoped media selection.

## Draft / Publish model

- Loading the page starts from the backend draft.
- Field changes are local until Save Draft is selected.
- Preview Draft stores the current editor state in browser local storage and opens `/site?preview=draft`.
- Draft preview is browser-local only; it does not call the backend or expose draft data through the public API.
- Save Draft updates the backend draft only.
- Publish promotes the saved draft to the backend published version.
- Live Website opens the normal published `/site` experience.
- The public landing page must consume only the published configuration.

This prevents an unfinished edit from becoming public accidentally.

## Authorization

The page is wrapped in the existing `ModuleRouteGuard` with `WEBSITE`. Backend `websiteRoutes` also requires authentication and `authorizeModule('WEBSITE')`. Frontend checks are UX only; backend authorization remains authoritative.

## Public-site integration

The public landing page consumes the published WebsiteConfig while continuing to use existing DoyBiz data for services, branches, staff, availability, and booking. CMS content must not duplicate or mutate those operational resources.

## Public booking experience

The existing public site supports two booking entry points without duplicating booking logic:

- Normal landing page: `/site?tenant=<slug>`
- Dedicated booking page: `/site/book?tenant=<slug>`

The dedicated booking page keeps the public landing-page header/navigation visible, while the booking flow is the primary page content. Navigation links point back to the corresponding landing-page sections. The same schedule, availability, customer-details, reservation, and confirmation flow is reused.

When Booking CTA mode is `page`, CTA clicks from the landing page preserve the tenant query and navigate to `/site/book?tenant=<slug>`. When mode is `modal`, the existing booking modal is used.

## Testing

Public Website behavior is covered by frontend Jest/React Testing Library tests in `src/components/public/client-landing-page.test.tsx`. Coverage includes landing-page rendering, tenant-aware navigation, dedicated booking-page navigation, CTA mode behavior, and availability loading.

CMS behavior is covered by `src/components/website-management-page.test.tsx`.

## Current limitations / future scope

- No drag-and-drop section ordering.
- No visual canvas/live inline editor.
- No SEO settings.
- No additional custom public pages.
- No theme/template marketplace.
- No custom-code editor.
- Custom domains remain a separate domain/tenant-resolution concern.

## Verification

Run:

```powershell
git pull
npm run typecheck
npm test -- --runInBand
npm run build
```

Then verify the public landing page and booking flow manually with a tenant query such as `/site?tenant=onepiecesalon` and the dedicated booking page `/site/book?tenant=onepiecesalon`.
