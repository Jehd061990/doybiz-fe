'use client';

import { useEffect, useState } from 'react';
import { useCustom, useCustomMutation, type HttpError } from '@refinedev/core';

type WebsiteValue = {
  branding: { primaryColor: string; accentColor: string; backgroundColor: string; textColor: string };
  hero: { eyebrow: string; title: string; description: string; cardLabel: string; cardTitle: string; backgroundImageUrl: string };
  bookingCta: { enabled: boolean; label: string; mode: 'modal' | 'page' };
  sections: {
    services: { enabled: boolean; eyebrow: string; title: string };
    branches: { enabled: boolean; eyebrow: string; title: string };
    contact: { enabled: boolean; eyebrow: string; title: string };
  };
  footer: { poweredByText: string };
};

type WebsiteResponse = { success: true; organizationSlug?: string | null; draft: WebsiteValue; published: WebsiteValue; publishedAt: string | null };\ntype MediaAsset = { _id: string; originalName: string; mimeType: string; size: number; url: string; createdAt: string };

const clone = (value: WebsiteValue): WebsiteValue => {
  const cloned = JSON.parse(JSON.stringify(value)) as WebsiteValue & { bookingCta?: Partial<WebsiteValue['bookingCta']> };
  return {
    ...cloned,
    bookingCta: {
      enabled: cloned.bookingCta?.enabled ?? true,
      label: cloned.bookingCta?.label || 'Book an appointment',
      mode: cloned.bookingCta?.mode === 'page' ? 'page' : 'modal',
    },
  };
};

export function WebsiteManagementPage() {
  const query = useCustom<WebsiteResponse>({ url: '/website', method: 'get' });
  const { mutateAsync, mutation } = useCustomMutation<WebsiteResponse, HttpError, WebsiteValue>({ mutationOptions: { gcTime: 0 } });
  const { mutateAsync: publishAsync, mutation: publishMutation } = useCustomMutation<WebsiteResponse, HttpError, Record<string, never>>({ mutationOptions: { gcTime: 0 } });
  const [draft, setDraft] = useState<WebsiteValue | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');\n  const [media, setMedia] = useState<MediaAsset[]>([]);\n  const [mediaLoading, setMediaLoading] = useState(false);\n  const [mediaUploading, setMediaUploading] = useState(false);

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

  const publicTenantQuery = query.result.data?.organizationSlug
    ? `?tenant=${encodeURIComponent(query.result.data.organizationSlug)}`
    : '';
  const liveWebsiteHref = publicTenantQuery ? `/site${publicTenantQuery}` : '/site';

  function previewDraft() {
    if (typeof window === 'undefined' || !draft) return;
    window.localStorage.setItem('doybiz:website-preview-draft', JSON.stringify(draft));
    window.open(`/site${publicTenantQuery}${publicTenantQuery ? '&' : '?'}preview=draft`, '_blank', 'noopener,noreferrer');
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
          <a className="secondary-button" href={liveWebsiteHref} target="_blank" rel="noreferrer">Live website</a>
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
            <label className="field-control"><span>Hero image URL (optional)</span><input type="url" value={draft.hero.backgroundImageUrl} onChange={event => updateHero('backgroundImageUrl', event.target.value)} placeholder="https://…" /></label>\n            <div className="field-control" style={{ gridColumn: '1 / -1' }}>\n              <span>Media Library</span>\n              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>\n                <label className="secondary-button" style={{ cursor: mediaUploading ? 'wait' : 'pointer' }}>\n                  {mediaUploading ? 'Uploading…' : 'Upload image'}\n                  <input type="file" accept="image/jpeg,image/png,image/webp" disabled={mediaUploading} hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadMedia(file); }} />\n                </label>\n                <small>JPG, PNG, or WebP · max 5 MB</small>\n              </div>\n              {mediaLoading ? <p>Loading media…</p> : media.length ? (\n                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginTop: 12 }}>\n                  {media.map(asset => (\n                    <div key={asset._id} style={{ border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>\n                      <img src={asset.url} alt={asset.originalName} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />\n                      <div style={{ padding: 8, display: 'grid', gap: 6 }}>\n                        <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.originalName}</small>\n                        <div style={{ display: 'flex', gap: 6 }}>\n                          <button type="button" className="secondary-button" onClick={() => selectHeroImage(asset.url)}>Use for hero</button>\n                          <button type="button" className="secondary-button" onClick={() => void deleteMedia(asset._id)}>Delete</button>\n                        </div>\n                      </div>\n                    </div>\n                  ))}\n                </div>\n              ) : <p>No uploaded images yet.</p>}\n            </div>
          </div>
        </section>

        <section className="billing-section">
          <div className="billing-section-heading"><h2>Booking CTA</h2></div>
          <div className="form-grid">
            <label className="field-control">
              <span><input type="checkbox" checked={draft.bookingCta.enabled} onChange={event => setDraft(current => current ? ({ ...current, bookingCta: { ...current.bookingCta, enabled: event.target.checked } }) : current)} /> Show booking CTA</span>
            </label>
            <label className="field-control">
              <span>Button text</span>
              <input value={draft.bookingCta.label} onChange={event => setDraft(current => current ? ({ ...current, bookingCta: { ...current.bookingCta, label: event.target.value } }) : current)} />
            </label>
            <label className="field-control">
              <span>Booking behavior</span>
              <select value={draft.bookingCta.mode} onChange={event => setDraft(current => current ? ({ ...current, bookingCta: { ...current.bookingCta, mode: event.target.value as 'modal' | 'page' } }) : current)}>
                <option value="modal">Open booking modal</option>
                <option value="page">Open dedicated booking page</option>
              </select>
            </label>
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
