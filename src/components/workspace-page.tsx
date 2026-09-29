import type { AuthUser } from '@/types/auth';

export function WorkspacePage({ user }: { user: AuthUser }) {
  return (
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
  );
}