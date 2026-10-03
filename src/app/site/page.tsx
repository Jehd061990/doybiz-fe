import { ClientLandingPage } from '@/components/public/client-landing-page';

export default async function PublicSitePage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string | string[]; preview?: string | string[] }>;
}) {
  const params = await searchParams;
  const tenant = Array.isArray(params.tenant) ? params.tenant[0] : params.tenant;
  const preview = Array.isArray(params.preview) ? params.preview[0] : params.preview;

  return <ClientLandingPage developmentTenant={tenant || undefined} previewDraft={preview === 'draft'} />;
}