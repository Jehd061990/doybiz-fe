import Link from 'next/link';
import { LogoutButton } from '@/components/logout-button';
import type { AuthUser } from '@/types/auth';

export function WorkspacePage({ user }: { user: AuthUser }) {
  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <Link className="wordmark" href="/app">doybiz<span>.</span></Link>
        <nav aria-label="Workspace navigation">
          <span className="nav-current">Workspace</span>
        </nav>
        <div className="account-menu">
          <span className="account-name">{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <section className="workspace-content" aria-labelledby="workspace-title">
        <p className="eyebrow">ORGANIZATION WORKSPACE</p>
        <h1 id="workspace-title">You’re signed in, {user.name.split(' ')[0]}.</h1>
        <p className="workspace-copy">Your DoyBiz workspace foundation is ready.</p>
        <div className="workspace-status" role="status">
          <span className="status-dot" aria-hidden="true" />
          <span>Account active</span>
          <span className="status-divider" aria-hidden="true">/</span>
          <span>{user.role}</span>
        </div>
      </section>
      <footer className="workspace-footer">
        <span>DOYBIZ</span>
        <span>Organization access is enforced by your account permissions.</span>
      </footer>
    </main>
  );
}