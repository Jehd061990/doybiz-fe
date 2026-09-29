'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCustom, useCustomMutation, type HttpError } from '@refinedev/core';
import { useBranches } from '@/lib/branches/use-branches';
import { getAppointmentErrorMessage } from '@/lib/appointments/errors';
import type { Reservation, ReservationListResponse } from '@/types/appointments';

const reservationId = (resv: Reservation) => resv.id || resv._id || '';

const customerName = (customer: Reservation['customerId']) => {
  if (typeof customer === 'object' && customer !== null) {
    return `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Customer';
  }
  return 'Customer';
};

const serviceName = (service: Reservation['serviceId']) => {
  if (typeof service === 'object' && service !== null) {
    return service.name || 'Service';
  }
  return 'Service';
};

const staffName = (staff: Reservation['staffId']) => {
  if (typeof staff === 'object' && staff !== null) {
    return `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || 'Staff';
  }
  return 'Staff';
};

const branchName = (branch: Reservation['branchId']) => {
  if (typeof branch === 'object' && branch !== null) {
    return branch.name || 'Branch';
  }
  return 'Branch';
};

export function AppointmentsPage() {
  const branchesQuery = useBranches();
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [actionError, setActionError] = useState<string | null>(null);

  const queryParams = new URLSearchParams();
  if (selectedBranchId) queryParams.set('branchId', selectedBranchId);
  if (statusFilter) queryParams.set('status', statusFilter);
  if (dateFilter) queryParams.set('date', dateFilter);
  queryParams.set('page', String(page));
  queryParams.set('limit', '25');

  const reservationsQuery = useCustom<ReservationListResponse>({
    url: `/reservations?${queryParams.toString()}`,
    method: 'get',
  });

  const cancelMutation = useCustomMutation<{ success: boolean; id?: string }, HttpError, Record<string, never>>({
    mutationOptions: { gcTime: 0 },
  });

  if (branchesQuery.query.isLoading) {
    return <p className="management-state" role="status">Loading branches…</p>;
  }
  if (branchesQuery.query.isError) {
    return <p className="management-error" role="alert">Unable to load branches.</p>;
  }

  const activeBranches = branchesQuery.result.data.filter(b => b.status === 'ACTIVE');
  const reservations = reservationsQuery.result.data?.data || [];
  const pagination = reservationsQuery.result.data?.pagination;

  async function handleCancel(id: string) {
    if (!window.confirm('Are you sure you want to cancel this reservation?')) return;
    setActionError(null);
    try {
      await cancelMutation.mutateAsync({
        url: `/reservations/${encodeURIComponent(id)}`,
        method: 'delete',
        values: {},
      });
      await reservationsQuery.query.refetch();
    } catch (error) {
      setActionError(getAppointmentErrorMessage(error, 'reservation'));
    }
  }

  return (
    <section className="management-page" aria-labelledby="reservations-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">APPOINTMENTS · SCHEDULE</p>
          <h1 id="reservations-heading">Appointments & reservations</h1>
          <p className="management-description">View and manage customer bookings, appointments, and staff schedules.</p>
        </div>
        <div className="management-page-actions">
          <Link className="secondary-button" href="/app/appointments/services">Services catalog</Link>
          <Link className="primary-button" href="/app/appointments/reservations/create">New reservation</Link>
        </div>
      </header>

      <div className="user-list-toolbar">
        <label className="field-control">
          <span>Date filter</span>
          <input
            type="date"
            value={dateFilter}
            onChange={event => {
              setDateFilter(event.currentTarget.value);
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
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>
        </label>
      </div>

      {actionError ? <p className="management-error" role="alert">{actionError}</p> : null}
      {reservationsQuery.query.isLoading ? <p className="management-state" role="status">Loading reservations…</p> : null}
      {reservationsQuery.query.isError ? (
        <p className="management-error" role="alert">{getAppointmentErrorMessage(reservationsQuery.query.error, 'reservation')}</p>
      ) : null}

      {!reservationsQuery.query.isLoading && !reservationsQuery.query.isError && reservations.length === 0 ? (
        <p className="billing-empty-note">No reservations found.</p>
      ) : null}

      {reservations.length ? (
        <div className="user-table-scroll">
          <table className="user-table">
            <thead>
              <tr>
                <th scope="col">Date & Time</th>
                <th scope="col">Customer</th>
                <th scope="col">Service</th>
                <th scope="col">Staff</th>
                <th scope="col">Branch</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(resv => {
                const id = reservationId(resv);
                return (
                  <tr key={id}>
                    <td>
                      <strong>{resv.appointmentDate}</strong>
                      <small className="field-help">{resv.appointmentTime} ({resv.durationMinutes}m)</small>
                    </td>
                    <td>{customerName(resv.customerId)}</td>
                    <td>{serviceName(resv.serviceId)}</td>
                    <td>{staffName(resv.staffId)}</td>
                    <td>{branchName(resv.branchId)}</td>
                    <td>
                      <span className={`status-badge status-${resv.status.toLowerCase()}`}>{resv.status}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link className="text-button" href={`/app/appointments/reservations/${id}`}>View</Link>
                        {resv.status !== 'CANCELLED' && resv.status !== 'COMPLETED' ? (
                          <button
                            className="text-button text-button-danger"
                            type="button"
                            onClick={() => handleCancel(id)}
                          >
                            Cancel
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
        <div className="pos-pagination" aria-label="Reservation pages">
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
