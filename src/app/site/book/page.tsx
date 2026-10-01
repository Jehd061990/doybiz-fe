import { ClientLandingPage } from '@/components/public/client-landing-page';

export default async function PublicBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string | string[] }>;
}) {
  const params = await searchParams;
  const tenant = Array.isArray(params.tenant) ? params.tenant[0] : params.tenant;

  return (
    <ClientLandingPage
      developmentTenant={tenant || undefined}
      openBookingOnLoad
    />
  );
}
