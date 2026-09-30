'use client';

import { useState } from 'react';
import { useCustom, useCustomMutation, type HttpError } from '@refinedev/core';
import { useBranches } from '@/lib/branches/use-branches';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getSalesErrorMessage } from '@/lib/sales/errors';
import type { PaymentMethod, Sale, SaleDetailResponse, SalePaymentResponse, SalePaymentsResponse, SalesListResponse, VoidSaleResponse } from '@/types/sales';

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);
const idOf = (value: unknown) => typeof value === 'string' ? value : typeof value === 'object' && value !== null
  ? String((value as { _id?: string; id?: string })._id || (value as { id?: string }).id || '') : '';
const branchName = (value: Sale['branchId']) => typeof value === 'object' && value ? value.name || idOf(value) : value;
const customerName = (value: Sale['customerId']) => typeof value === 'object' && value ? [value.firstName, value.lastName].filter(Boolean).join(' ') || value.phone || idOf(value) : value || 'Walk-in';
const cashierName = (value: Sale['cashierId']) => typeof value === 'object' && value ? value.name || value.email || idOf(value) : value || '—';

function SalesFilters({ onApply }: { onApply: (query: string) => void }) {
  const branches = useBranches();
  const [branchId, setBranchId] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('');

  function apply() {
    const params = new URLSearchParams();
    if (branchId) params.set('branchId', branchId);
    if (status) params.set('status', status);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    if (search.trim()) params.set('search', search.trim());
    if (date) params.set('date', date);
    params.set('page', '1');
    params.set('limit', '20');
    onApply(params.toString());
  }

  return (
    <section className="management-filters" aria-label="Sales filters">
      <label className="field-control"><span>Branch</span><select value={branchId} onChange={e => setBranchId(e.currentTarget.value)}>
        <option value="">All accessible branches</option>
        {branches.query.isLoading ? <option disabled>Loading…</option> : branches.result.data.filter(b => b.status === 'ACTIVE').map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
      </select></label>
      <label className="field-control"><span>Status</span><select value={status} onChange={e => setStatus(e.currentTarget.value)}>
        <option value="">All statuses</option><option value="COMPLETED">COMPLETED</option><option value="VOIDED">VOIDED</option><option value="REFUNDED">REFUNDED</option><option value="DRAFT">DRAFT</option>
      </select></label>
      <label className="field-control"><span>Payment</span><select value={paymentStatus} onChange={e => setPaymentStatus(e.currentTarget.value)}>
        <option value="">All payment statuses</option><option value="UNPAID">UNPAID</option><option value="PARTIALLY_PAID">PARTIALLY_PAID</option><option value="PAID">PAID</option><option value="REFUNDED">REFUNDED</option>
      </select></label>
      <label className="field-control"><span>Date</span><input type="date" value={date} onChange={e => setDate(e.currentTarget.value)} /></label>
      <label className="field-control"><span>Search</span><input value={search} onChange={e => setSearch(e.currentTarget.value)} placeholder="Sale number, customer, phone" /></label>
      <button className="primary-button" type="button" onClick={apply}>Apply filters</button>
      <p className="field-help">Branch options are limited to branches returned for this account.</p>
    </section>
  );
}

export function SalesListPage() {
  const { session, isLoading: sessionLoading } = useAuthSession();
  const [query, setQuery] = useState('page=1&limit=20');
  const user = session.user;
  const salesQuery = useCustom<SalesListResponse>({ url: `/sales?${query}`, method: 'get', queryOptions: { enabled: Boolean(user) } });

  const pagination = salesQuery.result.data?.pagination;
  const rows = salesQuery.result.data?.data || [];
  const currentPage = pagination?.page || 1;

  if (sessionLoading) return <p className="management-state" role="status">Loading session…</p>;
  if (!user) return null;

  return (
    <section className="management-page" aria-labelledby="sales-heading">
      <header className="management-page-header">
        <div><p className="eyebrow">OPERATIONS · SALES</p><h1 id="sales-heading">Sales</h1><p className="management-description">Review completed financial records and payment status for branches this account can access.</p></div>
      </header>
      <SalesFilters onApply={setQuery} />
      {salesQuery.query.isLoading ? <p className="management-state" role="status">Loading sales…</p> : null}
      {salesQuery.query.isError ? <p className="management-error" role="alert">{getSalesErrorMessage(salesQuery.query.error)}</p> : null}
      {!salesQuery.query.isLoading && !salesQuery.query.isError && rows.length === 0 ? <p className="billing-empty-note">No sales matched the selected filters.</p> : null}
      {rows.length ? (
        <div className="user-table-scroll">
          <table className="user-table">
            <thead><tr><th>Sale</th><th>Branch</th><th>Customer</th><th>Cashier</th><th>Total</th><th>Payment</th><th>Status</th><th>Date</th><th /></tr></thead>
            <tbody>{rows.map(sale => {
              const id = idOf(sale);
              return <tr key={id || sale.saleNumber}>
                <td><strong>{sale.saleNumber}</strong></td><td>{branchName(sale.branchId)}</td><td>{customerName(sale.customerId)}</td><td>{cashierName(sale.cashierId)}</td>
                <td>{money(sale.total)}</td><td>{sale.paymentStatus}</td><td>{sale.status}</td><td>{new Date(sale.createdAt).toLocaleString()}</td>
                <td><a className="text-button" href={`/app/sales/${encodeURIComponent(id)}`}>View</a></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      ) : null}
      {pagination && pagination.totalPages > 1 ? (
        <div className="pos-pagination" aria-label="Sales pages">
          <button className="secondary-button" type="button" disabled={currentPage <= 1} onClick={() => {
            const params = new URLSearchParams(query); params.set('page', String(currentPage - 1)); setQuery(params.toString());
          }}>Previous</button>
          <span>Page {currentPage} of {pagination.totalPages} · {pagination.total} sales</span>
          <button className="secondary-button" type="button" disabled={currentPage >= pagination.totalPages} onClick={() => {
            const params = new URLSearchParams(query); params.set('page', String(currentPage + 1)); setQuery(params.toString());
          }}>Next</button>
        </div>
      ) : null}
    </section>
  );
}

export function SaleDetailPage() {
  const { session, isLoading: sessionLoading } = useAuthSession();
  const user = session.user;
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amount, setAmount] = useState('');
  const [amountReceived, setAmountReceived] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const id = typeof window !== 'undefined' ? window.location.pathname.split('/').filter(Boolean).pop() || '' : '';
  const detail = useCustom<SaleDetailResponse>({ url: `/sales/${encodeURIComponent(id)}`, method: 'get', queryOptions: { enabled: Boolean(user && id) } });
  const payments = useCustom<SalePaymentsResponse>({ url: `/sales/${encodeURIComponent(id)}/payments`, method: 'get', queryOptions: { enabled: Boolean(user && id) } });
  const paymentMutation = useCustomMutation<SalePaymentResponse, HttpError>();
  const voidMutation = useCustomMutation<VoidSaleResponse, HttpError>();

  const sale = detail.result.data?.sale;
  const items = detail.result.data?.items || [];
  const paymentRows = payments.result.data?.payments || [];
  const canVoid = user?.role === 'OWNER' || user?.role === 'MANAGER';

  async function recordPayment() {
    setError(null); setMessage(null);
    if (!sale) return;
    const value = Number(amount); const received = Number(amountReceived);
    if (!Number.isFinite(value) || value <= 0) { setError('Enter a payment amount greater than zero.'); return; }
    if (paymentMethod === 'CASH' && (!Number.isFinite(received) || received < value)) { setError('Cash received must cover the payment amount.'); return; }
    try {
      const response = await paymentMutation.mutateAsync({ url: `/sales/${encodeURIComponent(id)}/payments`, method: 'post', values: {
        amount: value, paymentMethod,
        ...(paymentMethod === 'CASH' ? { amountReceived: received } : {}),
        ...(referenceNumber.trim() ? { referenceNumber: referenceNumber.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }});
      setMessage(response.data.payment.change > 0 ? `Payment recorded. Change: ${money(response.data.payment.change)}.` : 'Payment recorded.');
      setAmount(''); setAmountReceived(''); setReferenceNumber(''); setNotes('');
      await Promise.all([detail.query.refetch(), payments.query.refetch()]);
    } catch (e) { setError(getSalesErrorMessage(e, 'payment')); }
  }

  async function voidSale() {
    setError(null); setMessage(null);
    if (!sale) return;
    try {
      await voidMutation.mutateAsync({ url: `/sales/${encodeURIComponent(id)}/void`, method: 'post', values: { reason: voidReason.trim() || undefined }});
      setMessage('Sale voided by the backend.');
      await detail.query.refetch();
    } catch (e) { setError(getSalesErrorMessage(e, 'sale')); }
  }

  if (sessionLoading || detail.query.isLoading) return <p className="management-state" role="status">Loading sale…</p>;
  if (detail.query.isError || !sale) return <p className="management-error" role="alert">{getSalesErrorMessage(detail.query.error, 'sale details')}</p>;

  return (
    <section className="management-page" aria-labelledby="sale-detail-heading">
      <header className="management-page-header">
        <div><p className="eyebrow">SALES · DETAIL</p><h1 id="sale-detail-heading">{sale.saleNumber}</h1><p className="management-description">{branchName(sale.branchId)} · {customerName(sale.customerId)} · {new Date(sale.createdAt).toLocaleString()}</p></div>
        <a className="secondary-button" href="/app/sales">Back to sales</a>
      </header>
      <dl className="pos-sale-summary">
        <div><dt>Status</dt><dd>{sale.status}</dd></div><div><dt>Payment</dt><dd>{sale.paymentStatus}</dd></div><div><dt>Subtotal</dt><dd>{money(sale.subtotal)}</dd></div><div><dt>Discount</dt><dd>{money(sale.discount)}</dd></div><div><dt>Tax</dt><dd>{money(sale.tax)}</dd></div><div><dt>Total</dt><dd>{money(sale.total)}</dd></div><div><dt>Paid</dt><dd>{money(sale.amountPaid)}</dd></div><div><dt>Change</dt><dd>{money(sale.change)}</dd></div>
      </dl>
      <section className="pos-receipt" aria-labelledby="items-heading">
        <h2 id="items-heading">Sale items</h2>
        <div className="user-table-scroll"><table className="user-table"><thead><tr><th>Item</th><th>Type</th><th>Qty</th><th>Unit price</th><th>Discount</th><th>Total</th></tr></thead>
          <tbody>{items.map((item, i) => <tr key={item.id || item._id || `${item.name}-${i}`}><td>{item.name}</td><td>{item.itemType}</td><td>{item.quantity}</td><td>{money(item.unitPrice)}</td><td>{money(item.discount)}</td><td>{money(item.total)}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section className="pos-payment-panel" aria-labelledby="payments-heading">
        <h2 id="payments-heading">Payments</h2>
        {paymentRows.length ? paymentRows.map((payment, i) => <p key={payment.id || payment._id || i}>{payment.paymentMethod} · {money(payment.amount)} · {payment.status}{payment.referenceNumber ? ` · Ref ${payment.referenceNumber}` : ''}</p>) : <p className="field-help">No completed payments recorded.</p>}
        {sale.status === 'COMPLETED' && sale.paymentStatus !== 'PAID' ? (
          <form className="pos-payment-form" onSubmit={e => { e.preventDefault(); void recordPayment(); }}>
            <label className="field-control"><span>Amount</span><input type="number" min="0.01" step="0.01" required value={amount} onChange={e => setAmount(e.currentTarget.value)} /></label>
            <label className="field-control"><span>Payment method</span><select value={paymentMethod} onChange={e => setPaymentMethod(e.currentTarget.value as PaymentMethod)}>{(['CASH','GCASH','CARD','BANK_TRANSFER','OTHER'] as PaymentMethod[]).map(m => <option key={m} value={m}>{m.replace('_',' ')}</option>)}</select></label>
            {paymentMethod === 'CASH' ? <label className="field-control"><span>Cash received</span><input type="number" min="0.01" step="0.01" required value={amountReceived} onChange={e => setAmountReceived(e.currentTarget.value)} /></label> : null}
            <label className="field-control"><span>Reference <small>(optional)</small></span><input value={referenceNumber} onChange={e => setReferenceNumber(e.currentTarget.value)} /></label>
            <label className="field-control"><span>Notes <small>(optional)</small></span><input value={notes} onChange={e => setNotes(e.currentTarget.value)} /></label>
            {error ? <p className="management-error" role="alert">{error}</p> : null}{message ? <p className="management-success" role="status">{message}</p> : null}
            <button className="primary-button" type="submit" disabled={paymentMutation.mutation.isPending}>{paymentMutation.mutation.isPending ? 'Recording…' : 'Record payment'}</button>
          </form>
        ) : null}
      </section>
      {canVoid && sale.status === 'COMPLETED' ? (
        <section className="pos-payment-panel" aria-labelledby="void-heading">
          <h2 id="void-heading">Void sale</h2>
          <p className="field-help">This uses the backend void endpoint. Completed financial records are not physically deleted.</p>
          <label className="field-control"><span>Reason <small>(optional)</small></span><input value={voidReason} onChange={e => setVoidReason(e.currentTarget.value)} /></label>
          {error ? <p className="management-error" role="alert">{error}</p> : null}
          <button className="secondary-button" type="button" disabled={voidMutation.mutation.isPending} onClick={() => { if (window.confirm('Void this completed sale?')) void voidSale(); }}>{voidMutation.mutation.isPending ? 'Voiding…' : 'Void sale'}</button>
        </section>
      ) : null}
    </section>
  );
}
