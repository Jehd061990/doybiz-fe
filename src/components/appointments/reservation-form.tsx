'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { useCustom, useCustomMutation, type HttpError } from '@refinedev/core';
import { useBranches } from '@/lib/branches/use-branches';
import { getAppointmentErrorMessage } from '@/lib/appointments/errors';
import type {
  AppointmentCustomerListResponse,
  AppointmentServiceListResponse,
  AppointmentStaffListResponse,
  CreateReservationValues,
  Reservation,
} from '@/types/appointments';

const customerIdVal = (c: { id?: string; _id?: string }) => c.id || c._id || '';
const serviceIdVal = (s: { id?: string; _id?: string }) => s.id || s._id || '';
const staffIdVal = (st: { id?: string; _id?: string }) => st.id || st._id || '';

export function ReservationCreatePage() {
  const router = useRouter();
  const branchesQuery = useBranches();

  const [branchId, setBranchId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [appointmentDate, setAppointmentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [appointmentTime, setAppointmentTime] = useState('10:00');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const customersQuery = useCustom<AppointmentCustomerListResponse>({
    url: '/customers?status=ACTIVE&limit=100',
    method: 'get',
  });

  const servicesQuery = useCustom<AppointmentServiceListResponse>({
    url: branchId ? `/services?branchId=${encodeURIComponent(branchId)}&status=ACTIVE&limit=100` : '/services?status=ACTIVE&limit=100',
    method: 'get',
    queryOptions: { enabled: Boolean(branchId) },
  });

  const staffQuery = useCustom<AppointmentStaffListResponse>({
    url: branchId ? `/staff?branchId=${encodeURIComponent(branchId)}&status=ACTIVE&limit=100` : '/staff?status=ACTIVE&limit=100',
    method: 'get',
    queryOptions: { enabled: Boolean(branchId) },
  });

  const createMutation = useCustomMutation<{ success: boolean; reservation: Reservation }, HttpError, CreateReservationValues>({
    mutationOptions: { gcTime: 0 },
  });

  if (branchesQuery.query.isLoading || customersQuery.query.isLoading) {
    return <p className="management-state" role="status">Loading branches and customers…</p>;
  }
  if (branchesQuery.query.isError || customersQuery.query.isError) {
    return <p className="management-error" role="alert">Unable to load required data for new reservation.</p>;
  }

  const activeBranches = branchesQuery.result.data.filter(b => b.status === 'ACTIVE');
  const customers = customersQuery.result.data?.data || [];
  const services = servicesQuery.result.data?.data || [];
  const staffList = staffQuery.result.data?.data || [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);
    if (!branchId || !customerId || !serviceId || !staffId || !appointmentDate || !appointmentTime) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    try {
      const values: CreateReservationValues = {
        branchId,
        customerId,
        serviceId,
        staffId,
        appointmentDate,
        appointmentTime,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };
      await createMutation.mutateAsync({
        url: '/reservations',
        method: 'post',
        values,
      });
      router.push('/app/appointments');
    } catch (error) {
      setErrorMessage(getAppointmentErrorMessage(error, 'reservation'));
    }
  }

  return (
    <section className="management-page" aria-labelledby="reservation-create-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">APPOINTMENTS · SCHEDULE</p>
          <h1 id="reservation-create-heading">New reservation</h1>
          <p className="management-description">Schedule an appointment for a customer with an active service and staff member.</p>
        </div>
        <div className="management-page-actions">
          <Link className="secondary-button" href="/app/appointments">Cancel</Link>
        </div>
      </header>

      <form className="management-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label className="field-control">
            <span>Branch *</span>
            <select
              value={branchId}
              onChange={event => {
                setBranchId(event.currentTarget.value);
                setServiceId('');
                setStaffId('');
              }}
              required
            >
              <option value="">Select branch</option>
              {activeBranches.map(branch => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
          <label className="field-control">
            <span>Customer *</span>
            <select
              value={customerId}
              onChange={event => setCustomerId(event.currentTarget.value)}
              required
            >
              <option value="">Select active customer</option>
              {customers.map(c => {
                const cid = customerIdVal(c);
                return (
                  <option key={cid} value={cid}>
                    {c.firstName} {c.lastName} ({c.phone})
                  </option>
                );
              })}
            </select>
          </label>
          <label className="field-control">
            <span>Service *</span>
            <select
              value={serviceId}
              onChange={event => setServiceId(event.currentTarget.value)}
              required
              disabled={!branchId}
            >
              <option value="">{branchId ? 'Select service' : 'Select branch first'}</option>
              {services.map(s => {
                const sid = serviceIdVal(s);
                return (
                  <option key={sid} value={sid}>
                    {s.name} (₱{s.price}, {s.durationMinutes}m)
                  </option>
                );
              })}
            </select>
          </label>
          <label className="field-control">
            <span>Staff member *</span>
            <select
              value={staffId}
              onChange={event => setStaffId(event.currentTarget.value)}
              required
              disabled={!branchId}
            >
              <option value="">{branchId ? 'Select staff member' : 'Select branch first'}</option>
              {staffList.map(st => {
                const stid = staffIdVal(st);
                return (
                  <option key={stid} value={stid}>
                    {st.firstName} {st.lastName} — {st.position}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="field-control">
            <span>Appointment date *</span>
            <input
              type="date"
              required
              value={appointmentDate}
              onChange={event => setAppointmentDate(event.currentTarget.value)}
            />
          </label>
          <label className="field-control">
            <span>Appointment time *</span>
            <input
              type="time"
              required
              value={appointmentTime}
              onChange={event => setAppointmentTime(event.currentTarget.value)}
            />
          </label>
          <label className="field-control field-control-full">
            <span>Notes <small>(optional)</small></span>
            <textarea
              rows={3}
              placeholder="Special instructions or appointment notes…"
              value={notes}
              onChange={event => setNotes(event.currentTarget.value)}
            />
          </label>
        </div>

        {errorMessage ? <p className="management-error" role="alert">{errorMessage}</p> : null}

        <div className="form-actions">
          <Link className="secondary-button" href="/app/appointments">Cancel</Link>
          <button className="primary-button" type="submit" disabled={createMutation.mutation.isPending}>
            {createMutation.mutation.isPending ? 'Scheduling appointment…' : 'Create reservation'}
          </button>
        </div>
      </form>
    </section>
  );
}
