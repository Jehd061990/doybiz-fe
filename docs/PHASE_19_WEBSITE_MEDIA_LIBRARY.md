# Phase 19 — Website Media Library

## Status

IMPLEMENTED

## Purpose

Provide organization-scoped media management for Website CMS assets, currently used by the public Hero section.

## Behavior

- Upload JPG, PNG, or WebP images up to 5 MB.
- Uploaded media is organization-scoped.
- Preview uploaded images directly in the CMS.
- Select an image as the Hero background.
- Save Draft keeps the selected image in draft state.
- Publish promotes the draft Hero image to the live website.
- Existing external Hero image URLs remain supported.
- Draft Preview uses the same selected media URL.
- Media can be deleted from the CMS.

## API flow

The frontend CMS uploads through the authenticated same-origin backend media proxy. The backend stores the file and metadata. Public image rendering uses the media URL returned by the backend.

## Storage limitation

The current backend storage provider is local filesystem storage. It is suitable for local development and a single persistent server. Production deployments with multiple instances should migrate the storage provider to persistent object storage.

## Verification

Run the Website CMS Jest suite, typecheck, and build, then manually verify upload, select, save draft, preview, publish, and live Hero rendering.
