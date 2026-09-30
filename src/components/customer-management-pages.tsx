'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCreate, useCustom, useCustomMutation, useOne, useUpdate, type HttpError } from '@refinedev/core';
import { useState, type FormEvent } from 'react';
import { getCustomerErrorMessage } from '@/lib/customers/errors';
import type { Customer, CustomerFormValues, CustomerListResponse, CustomerStatus } from '@/types/customers';

function CustomerForm({
  mode,
  initialCustomer,
  isSaving,
  error,
  onSubmit,
}: {
  mode: 'create' | 'edit';
  initialCustomer?: Customer;
  isSaving: boolean;
  error: string | null;
  onSubmit: (values: CustomerFormValues) => Promise<boolean>;
}) {
  const [firstName, setFirstName] = useState(initialCustomer?.firstName || '');
  const [lastName, setLastName] = useState(initialCustomer?.lastName || '');
  const [phone, setPhone] = useState(initialCustomer?.phone || '');
  const [email, setEmail] = useState(initialCustomer?.email || '');
  const [address, setAddress] = useState(initialCustomer?.address || '');
  const [notes, setNotes] = useState(initialCustomer?.notes || '');
  const [status, setStatus] = useState<CustomerStatus>(initialCustomer?.status || 'ACTIVE');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(address.trim() ? { address: address.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      status,
    });
  }

  return (
    <form className="management-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="field-control"><span>First name *</span><input required value={firstName} onChange={e => setFirstName(e.currentTarget.value)} /></label>
        <label className="field-control"><span>Last name *</span><input required value={lastName} onChange={e => setLastName(e.currentTarget.value)} /></label>
        <label className="field-control"><span>Phone *</span><input required value={phone} onChange={e => setPhone(e.currentTarget.value)} /></label>
        <label className="field-control"><span>Email</span><input type="email" value={email} onChange={e => setEmail(e.currentTarget.value)} /></label>
        <label className="field-control field-control-full"><span>Address</span><input value={address} onChange={e => setAddress(e.currentTarget.value)} /></label>
        <label className="field-control"><span>Status</span><select value={status} onChange={e => setStatus(e.currentTarget.value as CustomerStatus)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
        <label className="field-control field-control-full"><span>Notes</span><textarea rows={4} value={notes} onChange={e => setNotes(e.currentTarget.value)} /></label>
      </div>
      {error ? <p className="management-error" role="alert">{error}</p> : null}
      <div className="form-actions">
        <Link className="secondary-button" href="/app/customers">Cancel</Link>
        <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : mode === 'create' ? 'Create customer' : 'Save changes'}</button>
      </div>
    </form>
  );
}

function CustomerListContent() {
  const [search, setSearch] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'ALL' | CustomerStatus>('ALL');
  const params = new URLSearchParams();
  if (search.trim()) params.set('search', search.trim());
  if (phone.trim()) params.set('phone', phone.trim());
  if (status !== 'ALL') params.set('status', status);
  params.set('page', '1');
  params.set('limit', '100');

  const query = useCustom<CustomerListResponse>({
    url: `/customers?${params.toString()}`,
    method: 'get',
  });

  if (query.query.isLoading) return <p className="management-state" role="status">Loading customers…</p>;
  if (query.query.isError) return <p className="management-error" role="alert">{getCustomerErrorMessage(query.query.error)}</p>;

  const customers = query.result.data?.data || [];
  return (
    <section className="management-page" aria-labelledby="customers-heading">
      <header className="management-page-header">
        <div><p className="eyebrow">CUSTOMERS</p><h1 id="customers-heading">Customers</h1><p className="management-description">Manage customer records used by appointments and sales.</p></div>
        <Link className="primary-action-link" href="/app/customers/create">Create customer</Link>
      </header>
      <div className="user-list-toolbar" aria-label="Customer filters">
        <label className="field-control search-control"><span>Search</span><input type="search" value={search} onChange={e => setSearch(e.currentTarget.value)} placeholder="Name, phone or email" /></label>
        <label className="field-control search-control"><span>Phone</span><input value={phone} onChange={e => setPhone(e.currentTarget.value)} placeholder="Phone number" /></label>
        <label className="field-control filter-control"><span>Status</span><select value={status} onChange={e => setStatus(e.currentTarget.value as typeof status)}><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
        <p className="result-count" role="status">{customers.length} customer{customers.length === 1 ? '' : 's'}</p>
      </div>
      {customers.length === 0 ? <div className="empty-state"><h2>No customers found.</h2><p>Create a customer record to use it in appointments and sales.</p><Link className="secondary-button" href="/app/customers/create">Create customer</Link></div> :
        <div className="user-table-scroll"><table className="user-table"><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead><tbody>{customers.map(customer => <tr key={customer.id || customer._id}><td><strong>{customer.firstName} {customer.lastName}</strong></td><td>{customer.phone}</td><td>{customer.email || '—'}</td><td><span className={`status-label status-label-${customer.status.toLowerCase()}`}>{customer.status}</span></td><td><Link className="table-action" href={`/app/customers/${encodeURIComponent(customer.id || customer._id || '')}`}>View / edit</Link></td></tr>)}</tbody></table></div>}
    </section>
  );
}

function CustomerCreateContent() {
  const router = useRouter();
  const { mutateAsync, mutation } = useCreate<Customer, HttpError, CustomerFormValues>({ resource: 'customers', mutationOptions: { gcTime: 0 } });
  const [error, setError] = useState<string | null>(null);
  async function save(values: CustomerFormValues) {
    setError(null);
    try { await mutateAsync({ resource: 'customers', values }); router.replace('/app/customers'); return true; }
    catch (e) { setError(getCustomerErrorMessage(e, 'create')); return false; }
  }
  return <section className="management-page" aria-labelledby="create-customer-heading"><header className="management-page-header"><div><p className="eyebrow">CUSTOMERS</p><h1 id="create-customer-heading">Create customer</h1><p className="management-description">Add a customer record to your organization.</p></div></header><CustomerForm mode="create" isSaving={mutation.isPending} error={error} onSubmit={save} /></section>;
}

function CustomerEditContent() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const query = useOne<Customer>({ resource: 'customers', id: customerId });
  const { mutateAsync, mutation } = useUpdate<Customer, HttpError, CustomerFormValues>({ resource: 'customers', id: customerId });
  const deleteMutation = useCustomMutation<{ success: boolean; customer: Customer }, HttpError, Record<string, never>>({ mutationOptions: { gcTime: 0 } });
  const [error, setError] = useState<string | null>(null);

  if (query.query.isLoading) return <p className="management-state" role="status">Loading customer…</p>;
  if (query.query.isError || !query.result) return <p className="management-error" role="alert">{getCustomerErrorMessage(query.query.error)}</p>;

  const customer = query.result;
  async function save(values: CustomerFormValues) {
    setError(null);
    try { await mutateAsync({ resource: 'customers', id: customerId, values }); router.replace('/app/customers'); return true; }
    catch (e) { setError(getCustomerErrorMessage(e, 'update')); return false; }
  }
  async function deactivate() {
    if (customer.status === 'INACTIVE' || !window.confirm('Deactivate this customer?')) return;
    setError(null);
    try {
      await deleteMutation.mutateAsync({ url: `/customers/${encodeURIComponent(customerId)}`, method: 'delete', values: {} });
      router.replace('/app/customers');
    } catch (e) { setError(getCustomerErrorMessage(e, 'delete')); }
  }

  return <section className="management-page" aria-labelledby="edit-customer-heading"><header className="management-page-header"><div><p className="eyebrow">CUSTOMERS</p><h1 id="edit-customer-heading">Customer details</h1><p className="management-description">Edit customer information or deactivate the record.</p></div><Link className="secondary-button" href="/app/customers">Back</Link></header><CustomerForm mode="edit" initialCustomer={customer} isSaving={mutation.isPending || deleteMutation.mutation.isPending} error={error} onSubmit={save} />{customer.status === 'ACTIVE' ? <div className="form-actions"><button className="secondary-button" type="button" onClick={deactivate} disabled={deleteMutation.mutation.isPending}>{deleteMutation.mutation.isPending ? 'Deactivating…' : 'Deactivate customer'}</button></div> : null}</section>;
}

export function CustomerListPage() { return <CustomerListContent />; }
export function CustomerCreatePage() { return <CustomerCreateContent />; }
export function CustomerEditPage() { return <CustomerEditContent />; }
