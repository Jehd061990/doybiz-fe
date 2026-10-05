'use client';

import { useEffect, useState } from 'react';
import { useCustom, useCustomMutation, type HttpError } from '@refinedev/core';
import { WEBSITE_TEMPLATES, type WebsiteTemplateKey } from './public/website-renderer';

type WebsiteSectionKey = 'HERO' | 'SERVICES' | 'BRANCHES' | 'CONTACT';
type WebsiteValue = {
  template: WebsiteTemplateKey;
  sectionOrder: WebsiteSectionKey[];
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

type WebsiteResponse = { success: true; organizationSlug?: string | null; draft: WebsiteValue; published: WebsiteValue; publishedAt: string | null };
type MediaAsset = { _id: string; originalName: string; mimeType: string; size: number; url: string; createdAt: string };

const clone = (value: WebsiteValue): WebsiteValue => {
  const cloned = JSON.parse(JSON.stringify(value)) as WebsiteValue & { bookingCta?: Partial<WebsiteValue['bookingCta']> };
  return {
    ...cloned,
    template: cloned.template === 'CLASSIC' ? 'CLASSIC' : 'CLASSIC',
    sectionOrder: Array.isArray(cloned.sectionOrder) ? [...new Set(cloned.sectionOrder)].filter((key): key is WebsiteSectionKey => ['HERO', 'SERVICES', 'BRANCHES', 'CONTACT'].includes(key)) : ['HERO', 'SERVICES', 'BRANCHES', 'CONTACT'],
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
  const [error, setError] = useState('');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<WebsiteSectionKey, boolean>>({
    HERO: true,
    SERVICES: true,
    BRANCHES: false,
    CONTACT: false,
  });

  useEffect(() => {
    if (query.result.data?.draft) setDraft(clone(query.result.data.draft));
  }, [query.result.data?.draft]);

  useEffect(() => {
    let cancelled = false;
    async function loadMedia() {
      setMediaLoading(true);
      try {
        const response = await fetch('/api/backend/media', { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Unable to load media library.');
        if (!cancelled) setMedia(Array.isArray(body.assets) ? body.assets : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load media library.');
      } finally {
        if (!cancelled) setMediaLoading(false);
      }
    }
    void loadMedia();
    return () => { cancelled = true; };
  }, []);

  async function uploadMedia(file: File) {
    setError('');
    setMessage('');
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller.');
      return;
    }
    const formData = new FormData();
    formData.append('file', file);
    setMediaUploading(true);
    try {
      const response = await fetch('/api/backend/media', { method: 'POST', body: formData });
      const body = await response.json();
      if (!response.ok || !body.asset) throw new Error(body.message || 'Unable to upload image.');
      setMedia(current => [body.asset as MediaAsset, ...current]);
      selectHeroImage((body.asset as MediaAsset).url);
      setMessage('Image uploaded and selected for the hero. Save draft to keep the change.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload image.');
    } finally {
      setMediaUploading(false);
    }
  }

  function selectHeroImage(url: string) {
    setDraft(current => current ? ({ ...current, hero: { ...current.hero, backgroundImageUrl: url } }) : current);
  }

  async function deleteMedia(id: string) {
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/backend/media/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to delete image.');
      setMedia(current => current.filter(asset => asset._id !== id));
      setMessage('Image deleted.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete image.');
    }
  }

  if (query.query.isLoading || !draft) return <p className="management-state" role="status">Loading website settings…</p>;
  if (query.query.isError) return <p className="management-error" role="alert">Unable to load website settings.</p>;

  const saving = mutation.isPending || publishMutation.isPending;
  const updateBranding = (key: keyof WebsiteValue['branding'], value: string) =>
    setDraft(current => current ? ({ ...current, branding: { ...current.branding, [key]: value } }) : current);
  const updateHero = (key: keyof WebsiteValue['hero'], value: string) =>
    setDraft(current => current ? ({ ...current, hero: { ...current.hero, [key]: value } }) : current);
  const updateSection = (key: keyof WebsiteValue['sections'], field: 'enabled' | 'eyebrow' | 'title', value: boolean | string) =>
    setDraft(current => current ? ({ ...current, sections: { ...current.sections, [key]: { ...current.sections[key], [field]: value } } }) : current);
  const sectionLabels: Record<WebsiteSectionKey, string> = { HERO: 'Hero', SERVICES: 'Services', BRANCHES: 'Branches', CONTACT: 'Contact' };
  const sectionKeys: WebsiteSectionKey[] = ['HERO', 'SERVICES', 'BRANCHES', 'CONTACT'];
  const toggleSectionExpanded = (key: WebsiteSectionKey) => setExpandedSections(current => ({ ...current, [key]: !current[key] }));
  const sectionEnabled = (key: WebsiteSectionKey) => key === 'HERO' ? true : draft?.sections[key.toLowerCase() as keyof WebsiteValue['sections']].enabled ?? false;
  const setSectionEnabled = (key: WebsiteSectionKey, enabled: boolean) => {
    if (!draft || key === 'HERO') return;
    const sectionKey = key.toLowerCase() as keyof WebsiteValue['sections'];
    setDraft(current => current ? ({ ...current, sections: { ...current.sections, [sectionKey]: { ...current.sections[sectionKey], enabled } } }) : current);
  };
  const removeSection = (key: WebsiteSectionKey) => {
    if (!draft || key === 'HERO') return;
    const sectionKey = key.toLowerCase() as keyof WebsiteValue['sections'];
    setDraft(current => current ? ({
      ...current,
      sectionOrder: current.sectionOrder.filter(item => item !== key),
      sections: { ...current.sections, [sectionKey]: { ...current.sections[sectionKey], enabled: false } },
    }) : current);
  };
  const addSection = (key: WebsiteSectionKey) => {
    if (!draft || key === 'HERO' || draft.sectionOrder.includes(key)) return;
    const sectionKey = key.toLowerCase() as keyof WebsiteValue['sections'];
    setDraft(current => current ? ({
      ...current,
      sectionOrder: [...current.sectionOrder, key],
      sections: { ...current.sections, [sectionKey]: { ...current.sections[sectionKey], enabled: true } },
    }) : current);
  };
  const moveSection = (key: WebsiteSectionKey, direction: -1 | 1) => setDraft(current => {
    if (!current) return current;
    const order = [...current.sectionOrder];
    const index = order.indexOf(key);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return current;
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    return { ...current, sectionOrder: order };
  });

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
    if (!draft) return;
    try {
      // Publish the exact draft currently being edited. This keeps Preview Draft
      // and Publish in sync even when the user has not clicked Save Draft first.
      await mutateAsync({ url: '/website', method: 'put', values: draft });
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
          <div className="billing-section-heading"><h2>Landing Page Template</h2></div>
          <div className="form-grid">
            {(Object.keys(WEBSITE_TEMPLATES) as WebsiteTemplateKey[]).map(key => (
              <label className="field-control" key={key}>
                <span>
                  <input
                    type="radio"
                    name="website-template"
                    value={key}
                    checked={draft.template === key}
                    onChange={() => setDraft(current => current ? ({ ...current, template: key }) : current)}
                  />
                  {WEBSITE_TEMPLATES[key].name}
                </span>
                <small>{WEBSITE_TEMPLATES[key].description}</small>
              </label>
            ))}
          </div>
        </section>

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
          <div className="billing-section-heading"><h2>Section Builder</h2></div>
          <p>Arrange sections, control visibility, and edit each section from its own card. Changes stay in the draft until you save.</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {draft.sectionOrder.map((key, index) => (
              <div key={key} style={{ border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto auto', gap: 8, alignItems: 'center', padding: 12 }}>
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => toggleSectionExpanded(key)}
                    aria-expanded={expandedSections[key]}
                    aria-controls={`website-section-content-${key.toLowerCase()}`}
                  >
                    {expandedSections[key] ? 'Collapse' : 'Edit'} {index + 1}. {sectionLabels[key]}
                  </button>
                  {key !== 'HERO' ? (
                    <label><input type="checkbox" checked={sectionEnabled(key)} onChange={event => setSectionEnabled(key, event.target.checked)} /> Enabled</label>
                  ) : <span>Core section</span>}
                  {key !== 'HERO' ? <button type="button" className="secondary-button" onClick={() => removeSection(key)}>Remove</button> : <span />}
                  <button type="button" className="secondary-button" onClick={() => moveSection(key, -1)} disabled={index === 0}>Move up</button>
                  <button type="button" className="secondary-button" onClick={() => moveSection(key, 1)} disabled={index === draft.sectionOrder.length - 1}>Move down</button>
                  <span aria-label={sectionEnabled(key) ? 'Visible' : 'Hidden'}>{sectionEnabled(key) ? 'Visible' : 'Hidden'}</span>
                </div>
                {expandedSections[key] && (
                  <div id={`website-section-content-${key.toLowerCase()}`} style={{ borderTop: '1px solid #e5e5e5', padding: 12 }}>
                    {key === 'HERO' ? (
                      <div className="form-grid">
                        <label className="field-control"><span>Eyebrow</span><input aria-label="Hero eyebrow" value={draft.hero.eyebrow} onChange={event => updateHero('eyebrow', event.target.value)} /></label>
                        <label className="field-control"><span>Headline</span><input aria-label="Hero headline" value={draft.hero.title} onChange={event => updateHero('title', event.target.value)} /></label>
                        <label className="field-control"><span>Description</span><textarea aria-label="Hero description" rows={3} value={draft.hero.description} onChange={event => updateHero('description', event.target.value)} /></label>
                        <label className="field-control"><span>Booking card label</span><input aria-label="Hero card label" value={draft.hero.cardLabel} onChange={event => updateHero('cardLabel', event.target.value)} /></label>
                        <label className="field-control"><span>Booking card title</span><input aria-label="Hero card title" value={draft.hero.cardTitle} onChange={event => updateHero('cardTitle', event.target.value)} /></label>
                        <label className="field-control"><span>Hero image URL (optional)</span><input aria-label="Hero image URL" type="url" value={draft.hero.backgroundImageUrl} onChange={event => updateHero('backgroundImageUrl', event.target.value)} placeholder="https://…" /></label>
                        <div className="field-control" style={{ gridColumn: '1 / -1' }}>
                          <span>Media Library</span>
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                            <label className="secondary-button" style={{ cursor: mediaUploading ? 'wait' : 'pointer' }}>
                              {mediaUploading ? 'Uploading…' : 'Upload image'}
                              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={mediaUploading} hidden onChange={event => { const file = event.target.files?.[0]; event.target.value = ''; if (file) void uploadMedia(file); }} />
                            </label>
                            <small>JPG, PNG, or WebP · max 5 MB</small>
                          </div>
                          {mediaLoading ? <p>Loading media…</p> : media.length ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginTop: 12 }}>
                              {media.map(asset => (
                                <div key={asset._id} style={{ border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
                                  <img src={asset.url} alt={asset.originalName} style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                                  <div style={{ padding: 8, display: 'grid', gap: 6 }}>
                                    <small style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.originalName}</small>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button type="button" className="secondary-button" onClick={() => selectHeroImage(asset.url)}>Use for hero</button>
                                      <button type="button" className="secondary-button" onClick={() => void deleteMedia(asset._id)}>Delete</button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : <p>No uploaded images yet.</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="form-grid">
                        <label className="field-control"><span><input type="checkbox" checked={sectionEnabled(key)} onChange={event => setSectionEnabled(key, event.target.checked)} /> Show {sectionLabels[key]}</span></label>
                        <label className="field-control"><span>Eyebrow</span><input aria-label={`${sectionLabels[key]} eyebrow`} value={draft.sections[key.toLowerCase() as keyof WebsiteValue['sections']].eyebrow} onChange={event => updateSection(key.toLowerCase() as keyof WebsiteValue['sections'], 'eyebrow', event.target.value)} /></label>
                        <label className="field-control"><span>Title</span><input aria-label={`${sectionLabels[key]} title`} value={draft.sections[key.toLowerCase() as keyof WebsiteValue['sections']].title} onChange={event => updateSection(key.toLowerCase() as keyof WebsiteValue['sections'], 'title', event.target.value)} /></label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {sectionKeys.filter(key => key !== 'HERO' && !draft.sectionOrder.includes(key)).length ? (
              <div style={{ marginTop: 4, padding: 12, border: '1px dashed #d4d4d4', borderRadius: 10 }}>
                <h3 style={{ margin: '0 0 6px' }}>Add Section</h3>
                <p style={{ margin: '0 0 10px' }}>Add a removed section back to the page. Its saved content will be restored.</p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {sectionKeys.filter(key => key !== 'HERO' && !draft.sectionOrder.includes(key)).map(key => (
                    <button key={key} type="button" className="secondary-button" onClick={() => addSection(key)}>Add {sectionLabels[key]}</button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <section className="billing-section">
          <div className="billing-section-heading"><h2>Footer</h2></div>
          <label className="field-control"><span>Footer text</span><input value={draft.footer.poweredByText} onChange={event => setDraft({ ...draft, footer: { ...draft.footer, poweredByText: event.target.value } })} /></label>
        </section>
      </div>
    </section>
  );
}
