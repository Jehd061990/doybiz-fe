'use client';

import { useState, type FormEvent } from 'react';

export interface LoginCredentials {
  email: string;
  password: string;
}

export function LoginForm({ onLogin }: { onLogin: (credentials: LoginCredentials) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    const formData = new FormData(event.currentTarget);
    const credentials = {
      email: String(formData.get('email') || '').trim(),
      password: String(formData.get('password') || ''),
    };
    try {
      await onLogin(credentials);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to sign in. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label htmlFor="email">Email address</label>
      <input id="email" name="email" type="email" autoComplete="username" required />

      <label htmlFor="password">Password</label>
      <div className="login-password-field">
        <input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          className="login-password-input"
        />
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          title={showPassword ? 'Hide password' : 'Show password'}
          className="login-password-toggle"
        >
          {showPassword ? (
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5.5 0 9.5 5 9.5 5s-1.2 1.5-3.2 2.8" />
              <path d="M6.1 6.1C3.9 7.5 2.5 9 2.5 9s4 5 9.5 5c1 0 1.9-.2 2.7-.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M2.5 9s4-5 9.5-5 9.5 5 9.5 5-4 5-9.5 5-9.5-5-9.5-5Z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
          )}
        </button>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  );
}
