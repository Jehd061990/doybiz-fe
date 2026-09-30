'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useBranches } from '@/lib/branches/use-branches';
import { apiRequest } from '@/lib/api/client';
import { hasModuleAccess } from '@/lib/auth/access';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { optimizeServiceImage } from '@/lib/images/optimize-service-image';
import { ServiceImage } from '@/components/services/service-image';
import type { Service, ServiceListResponse } from '@/types/services';

const idOf = (value: unknown) => typeof value === 'string'
  ? value
  : typeof value === 'object' && value !== null
    ? String((value as { _id?: string; id?: string })._id || (value as { id?: string }).id || '')
    : '';

const branchName = (value: Service['branchId']) => typeof value === 'object' && value
  ? value.name || idOf(value)
  : value || 'All branches';

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

function ServiceImageField({ source, imageValue, onSourceChange, onImageChange }: { source: 'UPLOAD' | 'URL' | 'NONE'; imageValue?: string; onSourceChange: (source: 'UPLOAD' | 'URL' | 'NONE') => void; onImageChange: (value: string | undefined) => void }) {
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);

  async function choose(file: File | undefined) {
    if (!file) return;
    setProcessing(true); setMessage(null);
    try {
      const result = await optimizeServiceImage(file);
      onImageChange(result.dataUrl);
      onSourceChange('UPLOAD');
      setMessage(`Optimized to ${Math.round(result.bytes / 1024)} KB · ${result.width}×${result.height}`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally { setProcessing(false); }
  }

  function changeUrl(value: string) {
    onImageChange(value.trim() || undefined);
    setUrlError(null);
    if (!value.trim()) return;
    try {
      const url = new URL(value.trim());
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
    } catch {
      setUrlError('Enter a valid public http:// or https:// image URL.');
    }
  }

  return (
    <div className="service-image-field">
      <div className="service-image-preview">
        <ServiceImage src={imageValue} alt="Service preview" />
      </div>
      <div className="service-image-controls">
        <div className="service-image-source-options" role="radiogroup" aria-label="Service image source">
          <label className="check-option"><input type="radio" name="service-image-source" checked={source === 'UPLOAD'} onChange={() => { onSourceChange('UPLOAD'); onImageChange(undefined); setMessage(null); setUrlError(null); }} /><span>Upload image</span></label>
          <label className="check-option"><input type="radio" name="service-image-source" checked={source === 'URL'} onChange={() => { onSourceChange('URL'); onImageChange(undefined); setMessage(null); setUrlError(null); }} /><span>Use image URL</span></label>
          <label className="check-option"><input type="radio" name="service-image-source" checked={source === 'NONE'} onChange={() => { onSourceChange('NONE'); onImageChange(undefined); setMessage(null); setUrlError(null); }} /><span>No image</span></label>
        </div>

        {source === 'UPLOAD' ? (
          <div className="service-image-actions">
            <label className="secondary-button service-upload-button">
              {processing ? 'Optimizing…' : 'Choose image'}
              <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={processing} onChange={event => void choose(event.currentTarget.files?.[0])} />
            </label>
            <span className="field-help">Optional. JPG, PNG, or WebP. Resized to max 800×800 and compressed to about 180 KB, with a 300 KB hard limit.</span>
          </div>
        ) : null}

        {source === 'URL' ? (
          <div className="service-image-url-control">
            <label className="field-control">
              <span>Image URL</span>
              <input value={imageValue || ''} onChange={event => changeUrl(event.currentTarget.value)} placeholder="https://example.com/service-image.jpg" inputMode="url" />
            </label>
            <p className="field-help">Paste a publicly accessible image link. DOYBIZ stores the URL and does not re-upload it to Cloudinary.</p>
            {urlError ? <p className="management-error" role="alert">{urlError}</p> : null}
          </div>
        ) : null}

        {source === 'NONE' ? <p className="field-help">Image is optional. If you leave it empty, DOYBIZ automatically uses the default service image.</p> : null}
        {message ? <p className="field-help" role="status">{message}</p> : null}
      </div>
    </div>
  );
}

export function ServiceListPage() {
  const { session, isLoading } = useAuthSession();
  const user = session.user;
  const branchesQuery = useBranches();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchId, setBranchId] = useState('');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const categories = useMemo(() => Array.from(new Set(services.map(service => service.category).filter(Boolean) as string[])).sort(), [services]);

  async function loadServices() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: '1', limit: '100' });
      if (status !== 'ALL') params.set('status', status);
      if (branchId) params.set('branchId', branchId);
      if (category) params.set('category', category);
      if (search.trim()) params.set('search', search.trim());
      const response = await apiRequest<ServiceListResponse>(`/services?${params.toString()}`);
      setServices(response.data);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (user) void loadServices(); }, [user, branchId, category, status]);

  if (isLoading) return <p className="management-state" role="status">Checking service access…</p>;
  if (!user) return null;
  if (!hasModuleAccess(user, 'SERVICES')) return <section className="management-state" role="alert"><h1>You don&apos;t have access to Services.</h1><p>Ask your organization administrator for the Services module.</p></section>;

  return (
    <section className="management-page" aria-labelledby="services-heading">
      <header className="management-page-header">
        <div><p className="eyebrow">CATALOG · SERVICES</p><h1 id="services-heading">Services</h1><p className="management-description">Create generic services for any business type and make them available as visual cards in POS.</p></div>
        <Link className="primary-action-link" href="/app/services/create">Create service</Link>
      </header>

      <section className="management-filters service-filters" aria-label="Service filters">
        <label className="field-control"><span>Branch</span><select value={branchId} onChange={e => setBranchId(e.currentTarget.value)}><option value="">All accessible branches</option>{branchesQuery.result.data.filter(b => b.status === 'ACTIVE').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="field-control"><span>Category</span><select value={category} onChange={e => setCategory(e.currentTarget.value)}><option value="">All categories</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="field-control"><span>Status</span><select value={status} onChange={e => setStatus(e.currentTarget.value as typeof status)}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label><label className="field-control service-search"><span>Search</span><input value={search} onChange={e => setSearch(e.currentTarget.value)} onKeyDown={e => { if (e.key === 'Enter') void loadServices(); }} placeholder="Name, code, category…" /></label>
        <button className="primary-button" type="button" onClick={() => void loadServices()}>Search</button>
      </section>

      {loading ? <p className="management-state" role="status">Loading services…</p> : null}
      {error ? <p className="management-error" role="alert">{error}</p> : null}
      {!loading && !error && services.length === 0 ? <div className="empty-state"><h2>No active services yet.</h2><p>Create a service with a price, duration, category, and optional image or image URL.</p><Link className="secondary-button" href="/app/services/create">Create service</Link></div> : null}

      {services.length ? <div className="service-admin-grid">
        {services.map(service => {
          const id = idOf(service);
          return <article className="service-admin-card" key={id || service.name}>
            <div className="service-admin-image"><ServiceImage src={service.imageUrl} alt="" /></div>
            <div className="service-admin-body">
              <div className="service-card-meta"><span>{service.category || 'Uncategorized'}</span><span>{service.status} · {branchName(service.branchId)}</span></div>
              <h2>{service.name}</h2>
              {service.description ? <p>{service.description}</p> : null}
              <div className="service-admin-price"><strong>{money(service.price)}</strong><span>{service.durationMinutes} min</span></div>
              <Link className="secondary-button" href={`/app/services/${encodeURIComponent(id)}`}>Edit service</Link>
            </div>
          </article>;
        })}
      </div> : null}
    </section>
  );
}

export function ServiceFormPage({ serviceId }: { serviceId?: string }) {
  const { session, isLoading } = useAuthSession();
  const user = session.user;
  const branchesQuery = useBranches();
  const editing = Boolean(serviceId);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<'UPLOAD' | 'URL' | 'NONE'>('NONE');
  const [imageValue, setImageValue] = useState<string | undefined>();
  const displayImage = imageSource === 'NONE' ? undefined : imageValue;

  useEffect(() => {
    if (!serviceId || !user) return;
    void apiRequest<{ success: true; service: Service }>(`/services/${encodeURIComponent(serviceId)}`).then(response => {
      setService(response.service);
      setImageSource(response.service.imageUrl ? (response.service.imagePublicId ? 'UPLOAD' : 'URL') : 'NONE');
      setImageValue(response.service.imageUrl);
    }).catch(e => setError((e as Error).message)).finally(() => setLoading(false));
  }, [serviceId, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setSaving(true);
    const form = new FormData(event.currentTarget);
    const imageUrl = imageSource === 'URL' ? imageValue?.trim() : undefined;
    if (imageSource === 'URL' && imageUrl) {
      try {
        const parsed = new URL(imageUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        setSaving(false);
        setError('Enter a valid public http:// or https:// image URL.');
        return;
      }
    }
    if (imageSource === 'URL' && !imageUrl) {
      setSaving(false);
      setError('Enter an image URL or choose No image.');
      return;
    }
    const payload = {
      name: String(form.get('name') || '').trim(),
      code: String(form.get('code') || '').trim() || undefined,
      category: String(form.get('category') || '').trim() || undefined,
      description: String(form.get('description') || '').trim() || undefined,
      price: Number(form.get('price')),
      durationMinutes: Number(form.get('durationMinutes')),
      branchId: String(form.get('branchId') || '') || undefined,
      status: String(form.get('status') || 'ACTIVE'),
      imageSource,
      ...(imageSource === 'UPLOAD' && imageValue ? { imageData: imageValue } : {}),
      ...(imageSource === 'URL' && imageUrl ? { imageUrl } : {}),
    };
    try {
      if (!payload.name || !Number.isFinite(payload.price) || payload.price < 0 || !Number.isFinite(payload.durationMinutes) || payload.durationMinutes < 1) throw new Error('Enter a service name, valid price, and duration.');
      const response = editing
        ? await apiRequest<{ success: true; service: Service }>(`/services/${encodeURIComponent(serviceId!)}`, { method: 'PUT', body: payload })
        : await apiRequest<{ success: true; service: Service }>('/services', { method: 'POST', body: payload });
      window.location.href = '/app/services';
      void response;
    } catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  }

  async function deactivate() {
    if (!serviceId || !window.confirm('Deactivate this service? It will no longer appear in POS.')) return;
    setSaving(true); setError(null);
    try { await apiRequest(`/services/${encodeURIComponent(serviceId)}`, { method: 'DELETE' }); window.location.href = '/app/services'; }
    catch (e) { setError((e as Error).message); setSaving(false); }
  }

  if (isLoading || loading) return <p className="management-state" role="status">Loading service…</p>;
  if (!user) return null;
  if (!hasModuleAccess(user, 'SERVICES')) return <p className="management-error" role="alert">You do not have access to the Services module.</p>;

  return (
    <section className="management-page" aria-labelledby="service-form-heading">
      <header className="management-page-header">
        <div><p className="eyebrow">CATALOG · SERVICES</p><h1 id="service-form-heading">{editing ? 'Edit service' : 'Create service'}</h1><p className="management-description">The service is reusable across generic business types and can be sold through POS.</p></div>
        <Link className="secondary-button" href="/app/services">Back to services</Link>
      </header>

      <form className="service-form" onSubmit={submit}>
        <section className="service-form-main">
          <div className="form-section"><h2>Service image <span className="field-optional">(optional)</span></h2><ServiceImageField source={imageSource} imageValue={displayImage} onSourceChange={setImageSource} onImageChange={setImageValue} /></div>
          <div className="form-section"><h2>Details</h2><div className="form-grid">
            <label className="field-control"><span>Service name *</span><input name="name" required defaultValue={service?.name} placeholder="e.g. Laptop Cleaning" /></label>
            <label className="field-control"><span>Service code</span><input name="code" defaultValue={service?.code} placeholder="e.g. SVC-001" /></label>
            <label className="field-control"><span>Category</span><input name="category" defaultValue={service?.category} placeholder="e.g. Computer Services" /></label>
            <label className="field-control"><span>Price *</span><input name="price" type="number" min="0" step="0.01" required defaultValue={service?.price ?? ''} /></label>
            <label className="field-control"><span>Duration (minutes) *</span><input name="durationMinutes" type="number" min="1" step="1" required defaultValue={service?.durationMinutes ?? 30} /></label>
            <label className="field-control"><span>Branch</span><select name="branchId" defaultValue={idOf(service?.branchId) || ''}><option value="">All accessible branches</option>{branchesQuery.result.data.filter(b => b.status === 'ACTIVE').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label className="field-control full-width"><span>Description</span><textarea name="description" rows={4} defaultValue={service?.description} placeholder="Describe what the customer receives…" /></label>
            <label className="field-control"><span>Status</span><select name="status" defaultValue={service?.status || 'ACTIVE'}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
          </div></div>
          {error ? <p className="management-error" role="alert">{error}</p> : null}
          <div className="form-actions"><Link className="secondary-button" href="/app/services">Cancel</Link><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Create service'}</button></div>
        </section>
        {editing ? <aside className="service-form-side"><div className="service-side-card"><span className="eyebrow">POS PREVIEW</span><div className="service-pos-preview"><ServiceImage src={displayImage} alt="" /><strong>{service?.name || 'Service name'}</strong><span>{service ? money(service.price) : '₱0.00'} · {service?.durationMinutes || 30} min</span></div><button className="secondary-button danger-button" type="button" onClick={() => void deactivate()} disabled={saving}>Deactivate service</button></div></aside> : null}
      </form>
    </section>
  );
}
