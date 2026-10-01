import { redirect } from 'next/navigation';

export default async function BookingPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string | string[] }>;
}) {
  const params = await searchParams;
  const tenant = Array.isArray(params.tenant) ? params.tenant[0] : params.tenant;
  redirect(tenant ? `/site/book?tenant=${encodeURIComponent(tenant)}` : '/site/book');
}
