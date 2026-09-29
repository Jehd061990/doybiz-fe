'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCustom, useCustomMutation, type HttpError } from '@refinedev/core';
import { useBranches } from '@/lib/branches/use-branches';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getAppointmentErrorMessage } from '@/lib/appointments/errors';
import type { AppointmentService, AppointmentServiceListResponse } from '@/types/appointments';

const serviceId = (service: AppointmentService) => service.id || service._id || '';

const branchName = (branchId: AppointmentService['branchId']) => {
  if (typeof branchId === 'object' && branchId !== null) return branchId.name;
  return branchId ? 'Assigned branch' : 'Organization-wide';
};

const currency = (val: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);

export function ServicesPage() {
  const { session } = useAuthSession();
  const branchesQuery = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOwnerOrManager = session.user?.role === 'OWNER' || session.user?.role === 'MANAGER';

  const queryParams = new URLSearchParams();
  if (selectedBranchId) queryParams.set('branchId', selectedBranchId);
  if (statusFilter) queryParams.set('status', statusFilter);
  if (search.trim()) queryParams.set('search', search.trim());
  queryParams.set('page', String(page));
  queryParams.set('limit', '25');

  const servicesQuery = useCustom<AppointmentServiceListResponse>({
    url: `/services?${queryParams.toString()}`,
    method: 'get',
  });

  const deleteMutation = useCustomMutation<{ success: boolean; id?: string }, HttpError, Record<string, never>>({
    mutationOptions: { gcTime: 0 },
  });

  if (branchesQuery.query.isLoading) {
    return <p className="management-state" role="status">Loading branches…</p>;
  }
  if (branchesQuery.query.isError) {
    return <p className="management-error" role="alert">Unable to load branches for services.</p>;
  }

  const activeBranches = branchesQuery.result.data.filter(b => b.status === 'ACTIVE');
  const services = servicesQuery.result.data?.data || [];
  const pagination = servicesQuery.result.data?.pagination;

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Are you sure you want to delete service "${name}"?`)) return;
    setActionError(null);
    try {
      await deleteMutation.mutateAsync({
        url: `/services/${encodeURIComponent(id)}`,
        method: 'delete',
        values: {},
      });
      await servicesQuery.query.refetch();
    } catch (error) {
      setActionError(getAppointmentErrorMessage(error, 'service'));
    }
  }

  return (
    <section className="management-page" aria-labelledby="services-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">APPOINTMENTS · SERVICES</p>
          <h1 id="services-heading">Services catalog</h1>
          <p className="management-description">Manage organization services and catalog items used for appointments and point of sale.</p>
        </div>
        <div className="management-page-actions">
          <Link className="secondary-button" href="/app/appointments">View reservations</Link>
          {isOwnerOrManager ? (
            <Link className="primary-button" href="/app/appointments/services/create">New service</Link>
          ) : null}
        </div>
      </header>

      <div className="user-list-toolbar">
        <label className="field-control search-control">
          <span>Search services</span>
          <input
            type="search"
            placeholder="Search by name or description…"
            value={search}
            onChange={event => {
              setSearch(event.currentTarget.value);
              setPage(1);
            }}
          />
        </label>
        <label className="field-control">
          <span>Branch filter</span>
          <select
            value={selectedBranchId}
            onChange={event => {
              setSelectedBranchId(event.currentTarget.value);
              setPage(1);
            }}
          >
            <option value="">All accessible branches</option>
            {activeBranches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </label>
        <label className="field-control">
          <span>Status</span>
          <select
            value={statusFilter}
            onChange={event => {
              setStatusFilter(event.currentTarget.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </label>
      </div>

      {actionError ? <p className="management-error" role="alert">{actionError}</p> : null}
      {servicesQuery.query.isLoading ? <p className="management-state" role="status">Loading services…</p> : null}
      {servicesQuery.query.isError ? (
        <p className="management-error" role="alert">{getAppointmentErrorMessage(servicesQuery.query.error, 'service')}</p>
      ) : null}

      {!servicesQuery.query.isLoading && !servicesQuery.query.isError && services.length === 0 ? (
        <p className="billing-empty-note">No services found.</p>
      ) : null}

      {services.length ? (
        <div className="user-table-scroll">
          <table className="user-table">
            <thead>
              <tr>
                <th scope="col">Service name</th>
                <th scope="col">Branch scope</th>
                <th scope="col">Price</th>
                <th scope="col">Duration</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map(service => {
                const id = serviceId(service);
                return (
                  <tr key={id}>
                    <td>
                      <strong>{service.name}</strong>
                      {service.description ? <small className="field-help">{service.description}</small> : null}
                    </td>
                    <td>{branchName(service.branchId)}</td>
                    <td>{currency(service.price)}</td>
                    <td>{service.durationMinutes} min</td>
                    <td>
                      <span className={`status-badge status-${service.status.toLowerCase()}`}>{service.status}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link className="text-button" href={`/app/appointments/services/${id}`}>
                          {isOwnerOrManager ? 'Edit' : 'View'}
                        </Link>
                        {isOwnerOrManager ? (
                          <button
                            className="text-button text-button-danger"
                            type="button"
                            onClick={() => handleDelete(id, service.name)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {pagination && pagination.totalPages > 1 ? (
        <div className="pos-pagination" aria-label="Services pages">
          <button className="secondary-button" type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            Previous
          </button>
          <span>Page {pagination.page} of {pagination.totalPages}</span>
          <button className="secondary-button" type="button" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </section>
  );
}
