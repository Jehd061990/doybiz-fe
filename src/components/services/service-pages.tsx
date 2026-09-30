'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useBranches } from '@/lib/branches/use-branches';
import { apiRequest } from '@/lib/api/client';
import { hasModuleAccess } from '@/lib/auth/access';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { optimizeServiceImage } from '@/lib/images/optimize-service-image';
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

function ServiceImageField({ value, onChange, onRemove }: { value?: string; onChange: (value: string | undefined) => void; onRemove?: () => void }) {
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function choose(file: File | undefined) {
    if (!file) return;
    setProcessing(true); setMessage(null);
    try {
      const result = await optimizeServiceImage(file);
      onChange(result.dataUrl);
      setMessage(`Optimized to ${Math.round(result.bytes / 1024)} KB · ${result.width}×${result.height}`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally { setProcessing(false); }
  }

  return (
    <div className="service-image-field">
      <div className="service-image-preview">
        {value ? <img src={value} alt="Service preview" /> : <div className="service-image-placeholder">No image</div>}
      </div>
      <div className="service-image-actions">
        <label className="secondary-button service-upload-button">
          {processing ? 'Optimizing…' : value ? 'Replace image' : 'Upload image'}
          <input type="file" accept="image/jpeg,image/png,image/webp" hidden disabled={processing} onChange={event => void choose(event.currentTarget.files?.[0])} />
        </label>
        {value ? <button className="text-button" type="button" onClick={() => { onChange(undefined); onRemove?.(); }}>Remove image</button> : null}
      </div>
      <p className="field-help">JPG, PNG, or WebP. Images are resized to max 800×800 and compressed to a target of about 180 KB, with a 300 KB hard limit.</p>
      {message ? <p className="field-help" role="status">{message}</p> : null}
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

  const categories = useMemo(() => Array.from(new Set(services.map(service => service.category).filter(Boolean) as string[])).sort(), [services]);

  async function loadServices() {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ status: 'ACTIVE', page: '1', limit: '100' });
      if (branchId) params.set('branchId', branchId);
      if (category) params.set('category', category);
      if (search.trim()) params.set('search', search.trim());
      const response = await apiRequest<ServiceListResponse>(`/services?${params.toString()}`);
      setServices(response.data);
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (user) void loadServices(); }, [user, branchId, category]);

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
        <label className="field-control service-search"><span>Search</span><input value={search} onChange={e => setSearch(e.currentTarget.value)} onKeyDown={e => { if (e.key === 'Enter') void loadServices(); }} placeholder="Name, code, category…" /></label>
        <button className="primary-button" type="button" onClick={() => void loadServices()}>Search</button>
      </section>

      {loading ? <p className="management-state" role="status">Loading services…</p> : null}
      {error ? <p className="management-error" role="alert">{error}</p> : null}
      {!loading && !error && services.length === 0 ? <div className="empty-state"><h2>No active services yet.</h2><p>Create a service with an image, price, duration, category, and branch assignment.</p><Link className="secondary-button" href="/app/services/create">Create service</Link></div> : null}

      {services.length ? <div className="service-admin-grid">
        {services.map(service => {
          const id = idOf(service);
          return <article className="service-admin-card" key={id || service.name}>
            <div className="service-admin-image">{service.imageUrl ? <img src={service.imageUrl} alt="" /> : <div className="service-image-placeholder">No image</div>}</div>
            <div className="service-admin-body">
              <div className="service-card-meta"><span>{service.category || 'Uncategorized'}</span><span>{branchName(service.branchId)}</span></div>
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
  const [imageData, setImageData] = useState<string | undefined>();
  const [removeImage, setRemoveImage] = useState(false);
  const displayImage = imageData !== undefined ? imageData : (removeImage ? undefined : service?.imageUrl);

  useEffect(() => {
    if (!serviceId || !user) return;
    void apiRequest<{ success: true; service: Service }>(`/services/${encodeURIComponent(serviceId)}`).then(response => {
      setService(response.service);
    }).catch(e => setError((e as Error).message)).finally(() => setLoading(false));
  }, [serviceId, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setSaving(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      name: String(form.get('name') || '').trim(),
      code: String(form.get('code') || '').trim() || undefined,
      category: String(form.get('category') || '').trim() || undefined,
      description: String(form.get('description') || '').trim() || undefined,
      price: Number(form.get('price')),
      durationMinutes: Number(form.get('durationMinutes')),
      branchId: String(form.get('branchId') || '') || undefined,
      status: String(form.get('status') || 'ACTIVE'),
      ...(imageData ? { imageData } : {}),
    };
    try {
      if (!payload.name || !Number.isFinite(payload.price) || payload.price < 0 || !Number.isFinite(payload.durationMinutes) || payload.durationMinutes < 1) throw new Error('Enter a service name, valid price, and duration.');
      const response = editing
        ? await apiRequest<{ success: true; service: Service }>(`/services/${encodeURIComponent(serviceId!)}`, { method: 'PUT', body: payload })
        : await apiRequest<{ success: true; service: Service }>('/services', { method: 'POST', body: payload });
      if (editing && removeImage && !imageData) {
        await apiRequest(`/services/${encodeURIComponent(serviceId!)}/image`, { method: 'DELETE' });
      }
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
          <div className="form-section"><h2>Service image</h2><ServiceImageField value={displayImage} onChange={value => { setImageData(value); setRemoveImage(!value); }} onRemove={() => { setImageData(undefined); setRemoveImage(true); }} /></div>
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
        {editing ? <aside className="service-form-side"><div className="service-side-card"><span className="eyebrow">POS PREVIEW</span><div className="service-pos-preview">{displayImage ? <img src={displayImage} alt="" /> : <div className="service-image-placeholder">No image</div>}<strong>{service?.name || 'Service name'}</strong><span>{service ? money(service.price) : '₱0.00'} · {service?.durationMinutes || 30} min</span></div><button className="secondary-button danger-button" type="button" onClick={() => void deactivate()} disabled={saving}>Deactivate service</button></div></aside> : null}
      </form>
    </section>
  );
}
