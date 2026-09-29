import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth/server-session';

export default async function OrganizationContextRoute() {
  const session = await getAuthSession();
  if (!session.authenticated || !session.organization) {
    redirect('/login');
    return null;
  }

  return (
    <section className="management-page organization-context-page" aria-labelledby="organization-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">CURRENT SESSION</p>
          <h1 id="organization-heading">Organization</h1>
        </div>
      </header>
      <dl className="organization-details">
        <div>
          <dt>Organization ID</dt>
          <dd>{session.organization.id}</dd>
        </div>
      </dl>
    </section>
  );
}