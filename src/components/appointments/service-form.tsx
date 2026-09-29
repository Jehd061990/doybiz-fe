'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useCustom, useCustomMutation, type HttpError } from '@refinedev/core';
import { useBranches } from '@/lib/branches/use-branches';
import { getAppointmentErrorMessage } from '@/lib/appointments/errors';
import type { AppointmentService, CreateServiceValues, UpdateServiceValues } from '@/types/appointments';

export function ServiceCreatePage() {
  const router = useRouter();
  const branchesQuery = useBranches();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCustomMutation<{ success: boolean; service: AppointmentService }, HttpError, CreateServiceValues>({
    mutationOptions: { gcTime: 0 },
  });

  if (branchesQuery.query.isLoading) {
    return <p className="management-state" role="status">Loading branches…</p>;
  }
  if (branchesQuery.query.isError) {
    return <p className="management-error" role="alert">Unable to load branches.</p>;
  }

  const activeBranches = branchesQuery.result.data.filter(b => b.status === 'ACTIVE');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const values: CreateServiceValues = {
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        price: Number(price),
        durationMinutes: Number(durationMinutes),
        ...(branchId ? { branchId } : {}),
        status,
      };
      await createMutation.mutateAsync({
        url: '/services',
        method: 'post',
        values,
      });
      router.push('/app/appointments/services');
    } catch (error) {
      setErrorMessage(getAppointmentErrorMessage(error, 'service'));
    }
  }

  return (
    <section className="management-page" aria-labelledby="service-create-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">APPOINTMENTS · SERVICES</p>
          <h1 id="service-create-heading">Create service</h1>
          <p className="management-description">Add a new service to the catalog for appointments and point of sale.</p>
        </div>
        <div className="management-page-actions">
          <Link className="secondary-button" href="/app/appointments/services">Cancel</Link>
        </div>
      </header>

      <form className="management-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field-control">
            <span>Service name *</span>
            <input
              type="text"
              required
              placeholder="e.g. Haircut & Styling"
              value={name}
              onChange={event => setName(event.currentTarget.value)}
            />
          </label>
          <label className="field-control">
            <span>Branch scope</span>
            <select value={branchId} onChange={event => setBranchId(event.currentTarget.value)}>
              <option value="">Organization-wide (all branches)</option>
              {activeBranches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Price (₱) *</span>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="0.00"
              value={price}
              onChange={event => setPrice(event.currentTarget.value)}
            />
          </label>
          <label className="field-control">
            <span>Duration (minutes) *</span>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={durationMinutes}
              onChange={event => setDurationMinutes(event.currentTarget.value)}
            />
          </label>
          <label className="field-control field-control-full">
            <span>Description <small>(optional)</small></span>
            <textarea
              rows={3}
              placeholder="Service details and inclusions…"
              value={description}
              onChange={event => setDescription(event.currentTarget.value)}
            />
          </label>
          <fieldset className="field-control field-control-full status-options">
            <legend>Status</legend>
            <label className="check-option">
              <input
                type="radio"
                name="status"
                value="ACTIVE"
                checked={status === 'ACTIVE'}
                onChange={() => setStatus('ACTIVE')}
              />
              <span>Active</span>
            </label>
            <label className="check-option">
              <input
                type="radio"
                name="status"
                value="INACTIVE"
                checked={status === 'INACTIVE'}
                onChange={() => setStatus('INACTIVE')}
              />
              <span>Inactive</span>
            </label>
          </fieldset>
        </div>

        {errorMessage ? <p className="management-error" role="alert">{errorMessage}</p> : null}

        <div className="form-actions">
          <Link className="secondary-button" href="/app/appointments/services">Cancel</Link>
          <button className="primary-button" type="submit" disabled={createMutation.mutation.isPending}>
            {createMutation.mutation.isPending ? 'Saving service…' : 'Create service'}
          </button>
        </div>
      </form>
    </section>
  );
}

export function ServiceDetailContainer({ id }: { id: string }) {
  const router = useRouter();
  const branchesQuery = useBranches();
  const serviceQuery = useCustom<{ success: boolean; service: AppointmentService }>({
    url: `/services/${encodeURIComponent(id)}`,
    method: 'get',
    queryOptions: { enabled: Boolean(id) },
  });

  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateMutation = useCustomMutation<{ success: boolean; service: AppointmentService }, HttpError, UpdateServiceValues>({
    mutationOptions: { gcTime: 0 },
  });

  if (branchesQuery.query.isLoading || serviceQuery.query.isLoading) {
    return <p className="management-state" role="status">Loading service details…</p>;
  }
  if (branchesQuery.query.isError || serviceQuery.query.isError || !serviceQuery.result.data?.service) {
    return <p className="management-error" role="alert">Unable to load service details.</p>;
  }

  const service = serviceQuery.result.data.service;
  const activeBranches = branchesQuery.result.data.filter(b => b.status === 'ACTIVE');
  const serviceBranchValue = typeof service.branchId === 'object' && service.branchId !== null
    ? (service.branchId.id || service.branchId._id || '')
    : (service.branchId || '');

  const currentName = name ?? service.name;
  const currentDesc = description ?? (service.description || '');
  const currentPrice = price ?? String(service.price);
  const currentDuration = durationMinutes ?? String(service.durationMinutes);
  const currentBranch = branchId ?? serviceBranchValue;
  const currentStatus = status ?? service.status;

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const values: UpdateServiceValues = {
        name: currentName.trim(),
        description: currentDesc.trim() ? currentDesc.trim() : undefined,
        price: Number(currentPrice),
        durationMinutes: Number(currentDuration),
        branchId: currentBranch ? currentBranch : null,
        status: currentStatus,
      };
      await updateMutation.mutateAsync({
        url: `/services/${encodeURIComponent(id)}`,
        method: 'put',
        values,
      });
      router.push('/app/appointments/services');
    } catch (error) {
      setErrorMessage(getAppointmentErrorMessage(error, 'service'));
    }
  }

  return (
    <section className="management-page" aria-labelledby="service-edit-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">APPOINTMENTS · SERVICES</p>
          <h1 id="service-edit-heading">Edit service</h1>
          <p className="management-description">Update service catalog item details.</p>
        </div>
        <div className="management-page-actions">
          <Link className="secondary-button" href="/app/appointments/services">Back to services</Link>
        </div>
      </header>

      <form className="management-form" onSubmit={handleUpdate}>
        <div className="form-grid">
          <label className="field-control">
            <span>Service name *</span>
            <input
              type="text"
              required
              value={currentName}
              onChange={event => setName(event.currentTarget.value)}
            />
          </label>
          <label className="field-control">
            <span>Branch scope</span>
            <select value={currentBranch} onChange={event => setBranchId(event.currentTarget.value)}>
              <option value="">Organization-wide (all branches)</option>
              {activeBranches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Price (₱) *</span>
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={currentPrice}
              onChange={event => setPrice(event.currentTarget.value)}
            />
          </label>
          <label className="field-control">
            <span>Duration (minutes) *</span>
            <input
              type="number"
              min="1"
              step="1"
              required
              value={currentDuration}
              onChange={event => setDurationMinutes(event.currentTarget.value)}
            />
          </label>
          <label className="field-control field-control-full">
            <span>Description <small>(optional)</small></span>
            <textarea
              rows={3}
              value={currentDesc}
              onChange={event => setDescription(event.currentTarget.value)}
            />
          </label>
          <fieldset className="field-control field-control-full status-options">
            <legend>Status</legend>
            <label className="check-option">
              <input
                type="radio"
                name="status"
                value="ACTIVE"
                checked={currentStatus === 'ACTIVE'}
                onChange={() => setStatus('ACTIVE')}
              />
              <span>Active</span>
            </label>
            <label className="check-option">
              <input
                type="radio"
                name="status"
                value="INACTIVE"
                checked={currentStatus === 'INACTIVE'}
                onChange={() => setStatus('INACTIVE')}
              />
              <span>Inactive</span>
            </label>
          </fieldset>
        </div>

        {errorMessage ? <p className="management-error" role="alert">{errorMessage}</p> : null}

        <div className="form-actions">
          <Link className="secondary-button" href="/app/appointments/services">Cancel</Link>
          <button className="primary-button" type="submit" disabled={updateMutation.mutation.isPending}>
            {updateMutation.mutation.isPending ? 'Saving changes…' : 'Save changes'}
          </button>
        </div>
      </form>
    </section>
  );
}
