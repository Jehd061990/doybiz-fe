import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="login-content">
      <div className="login-content-inner">
        <p className="eyebrow">404 / NOT FOUND</p>
        <h2>That page isn’t here.</h2>
        <p className="login-description">The requested workspace page could not be found.</p>
        <Link className="primary-button button-link" href="/">Return to workspace</Link>
      </div>
    </main>
  );
}
