'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useCustom, useCustomMutation, type HttpError } from '@refinedev/core';
import { getAppointmentErrorMessage } from '@/lib/appointments/errors';
import type { Reservation, ReservationStatus, UpdateReservationValues } from '@/types/appointments';

const statusOptions: ReservationStatus[] = ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export function ReservationDetailContainer({ id }: { id: string }) {
  const router = useRouter();
  const reservationQuery = useCustom<{ success: boolean; reservation: Reservation }>({
    url: `/reservations/${encodeURIComponent(id)}`,
    method: 'get',
    queryOptions: { enabled: Boolean(id) },
  });

  const [status, setStatus] = useState<ReservationStatus | null>(null);
  const [notes, setNotes] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateMutation = useCustomMutation<{ success: boolean; reservation: Reservation }, HttpError, UpdateReservationValues>({
    mutationOptions: { gcTime: 0 },
  });

  if (reservationQuery.query.isLoading) {
    return <p className="management-state" role="status">Loading reservation details…</p>;
  }
  if (reservationQuery.query.isError || !reservationQuery.result.data?.reservation) {
    return <p className="management-error" role="alert">Unable to load reservation details.</p>;
  }

  const reservation = reservationQuery.result.data.reservation;
  const currentStatus = status ?? reservation.status;
  const currentNotes = notes ?? (reservation.notes || '');

  const customer = typeof reservation.customerId === 'object' && reservation.customerId !== null ? reservation.customerId : null;
  const service = typeof reservation.serviceId === 'object' && reservation.serviceId !== null ? reservation.serviceId : null;
  const staff = typeof reservation.staffId === 'object' && reservation.staffId !== null ? reservation.staffId : null;
  const branch = typeof reservation.branchId === 'object' && reservation.branchId !== null ? reservation.branchId : null;

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    try {
      const values: UpdateReservationValues = {
        status: currentStatus,
        notes: currentNotes.trim() ? currentNotes.trim() : undefined,
      };
      await updateMutation.mutateAsync({
        url: `/reservations/${encodeURIComponent(id)}`,
        method: 'put',
        values,
      });
      router.push('/app/appointments');
    } catch (error) {
      setErrorMessage(getAppointmentErrorMessage(error, 'reservation'));
    }
  }

  return (
    <section className="management-page" aria-labelledby="reservation-detail-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">APPOINTMENTS · DETAILS</p>
          <h1 id="reservation-detail-heading">Reservation details</h1>
          <p className="management-description">Review appointment information, update status, and manage booking notes.</p>
        </div>
        <div className="management-page-actions">
          <Link className="secondary-button" href="/app/appointments">Back to schedule</Link>
        </div>
      </header>

      <div className="organization-details" style={{ marginBottom: '28px' }}>
        <div>
          <span>Customer</span>
          <strong>{customer ? `${customer.firstName} ${customer.lastName}` : '—'}</strong>
          <small>{customer?.phone} {customer?.email ? `· ${customer.email}` : ''}</small>
        </div>
        <div>
          <span>Service</span>
          <strong>{service?.name || '—'}</strong>
          <small>{service?.price !== undefined ? `₱${service.price}` : ''} {service?.durationMinutes ? `· ${service.durationMinutes} min` : ''}</small>
        </div>
        <div>
          <span>Staff assigned</span>
          <strong>{staff ? `${staff.firstName} ${staff.lastName}` : '—'}</strong>
          <small>{staff?.position || ''}</small>
        </div>
        <div>
          <span>Branch</span>
          <strong>{branch?.name || '—'}</strong>
          <small>{(branch as { name?: string; address?: string })?.address || ''}</small>
        </div>
      </div>

      <form className="management-form" onSubmit={handleUpdate}>
        <div className="form-grid">
          <label className="field-control">
            <span>Appointment date</span>
            <input type="date" disabled value={reservation.appointmentDate} />
          </label>
          <label className="field-control">
            <span>Appointment time</span>
            <input type="time" disabled value={reservation.appointmentTime} />
          </label>
          <label className="field-control">
            <span>Status</span>
            <select
              value={currentStatus}
              onChange={event => setStatus(event.currentTarget.value as ReservationStatus)}
            >
              {statusOptions.map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Booking source</span>
            <input type="text" disabled value={reservation.source} />
          </label>
          <label className="field-control field-control-full">
            <span>Notes</span>
            <textarea
              rows={3}
              value={currentNotes}
              onChange={event => setNotes(event.currentTarget.value)}
            />
          </label>
        </div>

        {errorMessage ? <p className="management-error" role="alert">{errorMessage}</p> : null}

        <div className="form-actions">
          <Link className="secondary-button" href="/app/appointments">Cancel</Link>
          <button className="primary-button" type="submit" disabled={updateMutation.mutation.isPending}>
            {updateMutation.mutation.isPending ? 'Updating reservation…' : 'Save reservation'}
          </button>
        </div>
      </form>
    </section>
  );
}
