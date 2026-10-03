# Phase 18 — Website CMS Frontend

## Status

IMPLEMENTED FOUNDATION. The first Website CMS editor is connected to the backend WebsiteConfig draft/published contract. Advanced page-builder features remain future work.

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
- Sections: Services, Branches, and Contact visibility plus eyebrow/title.
- Footer: powered-by text.

## Draft / Publish model

- Loading the page starts from the backend draft.
- Field changes are local until Save Draft is selected.
- Save Draft updates the backend draft only.
- Publish promotes the saved draft to the backend published version.
- The public landing page must consume only the published configuration.

This prevents an unfinished edit from becoming public accidentally.

## Authorization

The page is wrapped in the existing `ModuleRouteGuard` with `WEBSITE`. Backend `websiteRoutes` also requires authentication and `authorizeModule('WEBSITE')`. Frontend checks are UX only; backend authorization remains authoritative.

## Public-site integration

The public landing page consumes the published WebsiteConfig while continuing to use existing DoyBiz data for services, branches, staff, availability, and booking. CMS content must not duplicate or mutate those operational resources.

## Current limitations / future scope

- No media upload/media library yet.
- Hero image currently accepts a URL rather than an uploaded asset.
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

Then verify the public landing page and booking flow manually with a tenant query such as `/site?tenant=onepiecesalon` and the dedicated booking page.
