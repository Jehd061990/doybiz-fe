'use client';

import { useEffect, useState } from 'react';
import { useCustom, useCustomMutation, type HttpError } from '@refinedev/core';

type WebsiteValue = {
  branding: { primaryColor: string; accentColor: string; backgroundColor: string; textColor: string };
  hero: { eyebrow: string; title: string; description: string; cardLabel: string; cardTitle: string; backgroundImageUrl: string };
  sections: {
    services: { enabled: boolean; eyebrow: string; title: string };
    branches: { enabled: boolean; eyebrow: string; title: string };
    contact: { enabled: boolean; eyebrow: string; title: string };
  };
  footer: { poweredByText: string };
};

type WebsiteResponse = { success: true; draft: WebsiteValue; published: WebsiteValue; publishedAt: string | null };

const clone = (value: WebsiteValue): WebsiteValue => JSON.parse(JSON.stringify(value));

export function WebsiteManagementPage() {
  const query = useCustom<WebsiteResponse>({ url: '/website', method: 'get' });
  const { mutateAsync, mutation } = useCustomMutation<WebsiteResponse, HttpError, WebsiteValue>({ mutationOptions: { gcTime: 0 } });
  const { mutateAsync: publishAsync, mutation: publishMutation } = useCustomMutation<WebsiteResponse, HttpError, Record<string, never>>({ mutationOptions: { gcTime: 0 } });
  const [draft, setDraft] = useState<WebsiteValue | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (query.result.data?.draft) setDraft(clone(query.result.data.draft));
  }, [query.result.data?.draft]);

  if (query.query.isLoading || !draft) return <p className="management-state" role="status">Loading website settings…</p>;
  if (query.query.isError) return <p className="management-error" role="alert">Unable to load website settings.</p>;

  const saving = mutation.isPending || publishMutation.isPending;
  const updateBranding = (key: keyof WebsiteValue['branding'], value: string) =>
    setDraft(current => current ? ({ ...current, branding: { ...current.branding, [key]: value } }) : current);
  const updateHero = (key: keyof WebsiteValue['hero'], value: string) =>
    setDraft(current => current ? ({ ...current, hero: { ...current.hero, [key]: value } }) : current);
  const updateSection = (key: keyof WebsiteValue['sections'], field: 'enabled' | 'eyebrow' | 'title', value: boolean | string) =>
    setDraft(current => current ? ({ ...current, sections: { ...current.sections, [key]: { ...current.sections[key], [field]: value } } }) : current);

  function previewDraft() {
    if (typeof window === 'undefined' || !draft) return;
    window.localStorage.setItem('doybiz:website-preview-draft', JSON.stringify(draft));
    window.open('/site?preview=draft', '_blank', 'noopener,noreferrer');
  }

  async function saveDraft() {
    setError(''); setMessage('');
    if (!draft) return;
    try {
      await mutateAsync({ url: '/website', method: 'put', values: draft });
      setMessage('Draft saved. Publish it when you are ready to make the changes live.');
      await query.query.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save website settings.');
    }
  }

  async function publish() {
    setError(''); setMessage('');
    try {
      await publishAsync({ url: '/website/publish', method: 'post', values: {} });
      setMessage('Website changes are now published.');
      await query.query.refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to publish website changes.');
    }
  }

  return (
    <section className="management-page" aria-labelledby="website-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">WEBSITE CMS</p>
          <h1 id="website-heading">Website</h1>
          <p className="management-description">Customize your public landing page without changing your booking system.</p>
        </div>
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={previewDraft} disabled={saving}>Preview draft</button>
          <a className="secondary-button" href="/site" target="_blank" rel="noreferrer">Live website</a>
          <button className="secondary-button" type="button" onClick={saveDraft} disabled={saving}>{mutation.isPending ? 'Saving…' : 'Save draft'}</button>
          <button className="primary-button" type="button" onClick={publish} disabled={saving}>{publishMutation.isPending ? 'Publishing…' : 'Publish'}</button>
        </div>
      </header>

      {message ? <p className="management-success" role="status">{message}</p> : null}
      {error ? <p className="management-error" role="alert">{error}</p> : null}

      <div className="form-grid">
        <section className="billing-section">
          <div className="billing-section-heading"><h2>Branding</h2></div>
          <div className="form-grid">
            {([
              ['primaryColor', 'Primary color'], ['accentColor', 'Accent color'],
              ['backgroundColor', 'Background color'], ['textColor', 'Text color'],
            ] as const).map(([key, label]) => (
              <label className="field-control" key={key}><span>{label}</span><input value={draft.branding[key]} onChange={event => updateBranding(key, event.target.value)} placeholder="#111111" /></label>
            ))}
          </div>
        </section>

        <section className="billing-section">
          <div className="billing-section-heading"><h2>Hero section</h2></div>
          <div className="form-grid">
            <label className="field-control"><span>Eyebrow</span><input value={draft.hero.eyebrow} onChange={event => updateHero('eyebrow', event.target.value)} /></label>
            <label className="field-control"><span>Headline</span><input value={draft.hero.title} onChange={event => updateHero('title', event.target.value)} /></label>
            <label className="field-control"><span>Description</span><textarea rows={3} value={draft.hero.description} onChange={event => updateHero('description', event.target.value)} /></label>
            <label className="field-control"><span>Booking card label</span><input value={draft.hero.cardLabel} onChange={event => updateHero('cardLabel', event.target.value)} /></label>
            <label className="field-control"><span>Booking card title</span><input value={draft.hero.cardTitle} onChange={event => updateHero('cardTitle', event.target.value)} /></label>
            <label className="field-control"><span>Hero image URL</span><input type="url" value={draft.hero.backgroundImageUrl} onChange={event => updateHero('backgroundImageUrl', event.target.value)} placeholder="https://…" /></label>
          </div>
        </section>

        <section className="billing-section">
          <div className="billing-section-heading"><h2>Sections</h2></div>
          {(['services', 'branches', 'contact'] as const).map(key => (
            <div key={key} style={{ display: 'grid', gap: 10, padding: '12px 0', borderBottom: '1px solid #e5e5e5' }}>
              <label className="field-control"><span><input type="checkbox" checked={draft.sections[key].enabled} onChange={event => updateSection(key, 'enabled', event.target.checked)} /> Show {key}</span></label>
              <div className="form-grid">
                <label className="field-control"><span>Eyebrow</span><input value={draft.sections[key].eyebrow} onChange={event => updateSection(key, 'eyebrow', event.target.value)} /></label>
                <label className="field-control"><span>Title</span><input value={draft.sections[key].title} onChange={event => updateSection(key, 'title', event.target.value)} /></label>
              </div>
            </div>
          ))}
        </section>

        <section className="billing-section">
          <div className="billing-section-heading"><h2>Footer</h2></div>
          <label className="field-control"><span>Footer text</span><input value={draft.footer.poweredByText} onChange={event => setDraft({ ...draft, footer: { ...draft.footer, poweredByText: event.target.value } })} /></label>
        </section>
      </div>
    </section>
  );
}
