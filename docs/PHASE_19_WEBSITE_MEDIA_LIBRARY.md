# Phase 19 — Website Media Library

The Website CMS now includes a Media Library for Hero images.

## Behavior

- Upload JPG, PNG, or WebP images up to 5 MB.
- Uploaded media is organization-scoped.
- Preview uploaded images directly in the CMS.
- Select an image as the Hero background.
- Save Draft keeps the selected image in draft state.
- Publish promotes the draft Hero image to the live website.
- Existing external Hero image URLs remain supported.
- Draft Preview uses the same selected media URL.

## API flow

The browser uploads through the authenticated `/api/backend/website/media` proxy. The backend stores the file and metadata. Public image rendering uses the same-origin `/api/media/...` proxy so the landing page does not need to know the backend host.

## Storage limitation

The current backend storage provider is local filesystem storage. It is suitable for local development and a single persistent server. Production deployments with multiple instances should migrate the storage provider to persistent object storage.
