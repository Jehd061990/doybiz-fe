import { LoginPanel } from '@/app/login/login-panel';

export function LoginScreen() {
  return (
    <main className="login-layout">
      <aside className="login-brand-panel" aria-label="DoyBiz">
        <div className="brand-mark" aria-hidden="true">D</div>
        <p className="eyebrow">DOYBIZ WORKSPACE</p>
        <h1>Good business,<br />well organized.</h1>
        <p className="brand-caption">One clear place for your day-to-day operations.</p>
        <span className="brand-index" aria-hidden="true">01 / WORKSPACE</span>
      </aside>
      <section className="login-content" aria-labelledby="login-title">
        <div className="login-content-inner">
          <p className="eyebrow">YOUR ORGANIZATION</p>
          <h2 id="login-title">Welcome back</h2>
          <p className="login-description">Sign in with your DoyBiz account.</p>
          <LoginPanel />
          <p className="login-footnote">Access is managed by your organization.</p>
        </div>
      </section>
    </main>
  );
}
