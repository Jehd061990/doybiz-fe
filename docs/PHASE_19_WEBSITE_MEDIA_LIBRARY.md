# Phase 19 — Website Media Library

## Status

IMPLEMENTED

## Purpose

Provide organization-scoped media management for Website CMS assets used by the public website, including Hero and Logo media.

## Current implementation

- Upload JPG, PNG, or WebP images up to 5 MB.
- Uploaded media is organization-scoped.
- New media uploads are stored in Cloudinary.
- Cloudinary assets use the organization media folder:
  `doybiz/organizations/{organizationId}/media`.
- Each uploaded asset receives a unique media public ID.
- The backend stores the Cloudinary secure URL and public ID in `MediaAsset`.
- Preview uploaded images directly in the CMS.
- Select an image as the Hero background or Logo.
- Save Draft keeps the selected image URL in draft state.
- Draft Preview uses the same selected media URL.
- Publish promotes the draft media settings to the live website.
- Existing external Hero/Logo image URLs remain supported.
- Media can be deleted from the CMS.
- Media currently referenced by the draft or published Hero cannot be deleted.

## API flow

The frontend CMS uploads through the authenticated same-origin backend media proxy:

1. CMS sends the image to `/api/backend/media`.
2. The frontend/backend authentication flow protects the media endpoint with the existing Website module authorization.
3. The backend validates the image type and 5 MB size limit.
4. The backend uploads the image to Cloudinary.
5. The backend stores the resulting Cloudinary public ID and secure URL in `MediaAsset`.
6. The CMS uses the returned URL for preview and Website CMS settings.
7. Public website rendering uses the stored media URL directly.

The frontend does not need to proxy new Cloudinary image bytes through Next.js.

## Storage and backward compatibility

Cloudinary is the current storage provider for new Website CMS media.

Legacy media assets created before the Cloudinary migration may still contain local filesystem URLs. Those assets remain supported for backward compatibility.

The existing authenticated media/static compatibility route for legacy `/uploads/media` content should not be removed until all legacy local assets have been migrated or retired.

When deleting a legacy local asset, the backend falls back to removing the corresponding local file. Cloudinary-backed assets are deleted through the Cloudinary API.

## Website CMS integration

Phase 19 media is integrated with the broader Website CMS implementation:

- Template selection supports Classic, Modern Luxury, and Minimal Modern.
- Hero and Logo media can be uploaded from the CMS.
- Section Builder supports adding, removing, reordering, editing, enabling, and disabling sections.
- Save Draft persists the current draft configuration.
- Draft Preview renders the draft configuration without publishing it.
- Publish promotes the exact saved draft to the public website.
- The dedicated `/site/book` booking page reuses the public Website configuration while keeping booking as the primary action.

## Security and validation

- Media upload requires authentication.
- Media upload requires Website module access.
- Organization scoping prevents users from listing or deleting another organization's media.
- Accepted MIME types are JPEG, PNG, and WebP.
- Maximum upload size is 5 MB.
- Cloudinary credentials are required for production deployments.
- If the MongoDB `MediaAsset` record cannot be created after a Cloudinary upload, the uploaded Cloudinary asset is cleaned up.

## Verification

Backend:

- `npm run typecheck`
- `npm run build`
- `npm test`
- `npm run test:phase8`

The Phase 8 media integration test verifies Cloudinary upload, organization-scoped metadata, HTTPS Cloudinary URL storage, media listing, and deletion.

Frontend:

- `npm run typecheck`
- `npm test -- --runInBand`
- `npm run build`

Current frontend verification passes with:

- 27 test suites passed
- 131 tests passed
- TypeScript typecheck passed
- Next.js production build passed

Manual CMS verification should still cover:

1. Upload a valid JPG/PNG/WebP image.
2. Confirm the image appears in the organization media library.
3. Select it as Hero or Logo media.
4. Save Draft.
5. Open Draft Preview and confirm the image renders.
6. Publish.
7. Confirm the live public website renders the published image.
8. Confirm an in-use Hero image cannot be deleted.
9. Confirm an unused media asset can be deleted.
10. Confirm legacy local media URLs continue to render where applicable.
