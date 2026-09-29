'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCustom, useCustomMutation, useList, type HttpError } from '@refinedev/core';
import { getBillingErrorMessage } from '@/lib/billing/errors';
import type {
  BillingEstimate,
  BillingRecord,
  OrganizationSubscription,
} from '@/types/billing';
import type { AuthUser } from '@/types/auth';
import { BillingGate, BillingStatus, formatBillingAmount, formatBillingDate } from './billing-shared';

interface BillingEstimateResponse {
  id?: string;
  success: boolean;
  estimate: BillingEstimate;
}

interface BillingSubscriptionResponse {
  id?: string;
  success: boolean;
  subscription: OrganizationSubscription | null;
}

interface GenerateInvoiceResponse {
  id?: string;
  success: boolean;
  billing: BillingRecord;
}

interface ActivateSubscriptionResponse {
  id?: string;
  success: boolean;
  subscription: OrganizationSubscription;
  setupInvoice: BillingRecord;
}

function BillingOverviewContent({ user }: { user: AuthUser }) {
  const router = useRouter();
  const billingQuery = useList<BillingRecord>({ resource: 'billing', pagination: { mode: 'off' } });
  const estimateQuery = useCustom<BillingEstimateResponse>({ url: '/subscription/estimate', method: 'get' });
  const subscriptionQuery = useCustom<BillingSubscriptionResponse>({ url: '/subscription', method: 'get' });
  const { mutateAsync, mutation } = useCustomMutation<GenerateInvoiceResponse, HttpError, Record<string, never>>({
    mutationOptions: { gcTime: 0 },
  });
  const { mutateAsync: activateAsync, mutation: activationMutation } = useCustomMutation<
    ActivateSubscriptionResponse,
    HttpError,
    { paymentTermMonths: 1 | 3 | 6 | 12 }
  >({ mutationOptions: { gcTime: 0 } });
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [paymentTermMonths, setPaymentTermMonths] = useState<1 | 3 | 6 | 12>(1);

  const isLoading = billingQuery.query.isLoading || estimateQuery.query.isLoading || subscriptionQuery.query.isLoading;
  const queryError = billingQuery.query.error || estimateQuery.query.error || subscriptionQuery.query.error;

  async function refreshBilling() {
    await Promise.all([
      billingQuery.query.refetch(),
      estimateQuery.query.refetch(),
      subscriptionQuery.query.refetch(),
    ]);
  }

  async function generateInvoice() {
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await mutateAsync({ url: '/billing/generate', method: 'post', values: {} });
      setActionSuccess(`Invoice ${response.data.billing.invoiceNumber} is ready.`);
      await billingQuery.query.refetch();
    } catch (error) {
      setActionError(getBillingErrorMessage(error, 'generate'));
    }
  }

  async function activateSubscription() {
    setActionError(null);
    setActionSuccess(null);
    try {
      const response = await activateAsync({
        url: '/subscription/activate',
        method: 'post',
        values: { paymentTermMonths },
      });
      const invoiceId = response.data.setupInvoice.id || response.data.setupInvoice._id;
      if (!invoiceId) {
        setActionError('The subscription was created, but its setup invoice could not be opened. Refresh billing history.');
        return;
      }
      router.push(`/app/billing/${encodeURIComponent(invoiceId)}`);
    } catch (error) {
      setActionError(getBillingErrorMessage(error, 'activate'));
    }
  }

  if (isLoading) return <p className="management-state" role="status">Loading billing information…</p>;
  if (billingQuery.query.isError || estimateQuery.query.isError || subscriptionQuery.query.isError) {
    return <p className="management-error" role="alert">{getBillingErrorMessage(queryError)}</p>;
  }

  const estimate = estimateQuery.result.data.estimate;
  const subscription = subscriptionQuery.result.data.subscription;
  const records = billingQuery.result.data;
  const pendingAdjustments = records.filter(record =>
    record.billingType === 'ADJUSTMENT' && (record.status === 'PENDING' || record.status === 'OVERDUE'));

  return (
    <section className="management-page billing-page" aria-labelledby="billing-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">ORGANIZATION BILLING</p>
          <h1 id="billing-heading">Billing</h1>
          <p className="management-description">Seat usage and billing records are provided by your organization’s billing service.</p>
        </div>
        <button className="secondary-button" type="button" onClick={refreshBilling}>Refresh billing</button>
      </header>

      <section className="billing-section" aria-labelledby="subscription-heading">
        <div className="billing-section-heading">
          <h2 id="subscription-heading">Subscription</h2>
          {subscription ? <BillingStatus status={subscription.status} /> : null}
        </div>
        {subscription ? (
          <dl className="billing-subscription-grid">
            <div><dt>Plan</dt><dd>{estimate.plan.name}</dd></div>
            <div><dt>Prepaid term</dt><dd>{subscription.paymentTermMonths} months</dd></div>
            <div><dt>Current period</dt><dd>{formatBillingDate(subscription.currentPeriodStart)} – {formatBillingDate(subscription.currentPeriodEnd)}</dd></div>
            <div><dt>Setup fee</dt><dd>{subscription.setupFeeStatus}</dd></div>
          </dl>
        ) : (
          <div className="billing-activation-panel">
            <p className="billing-empty-note">No subscription is available for this organization.</p>
            {user.role === 'OWNER' ? (
              <div className="billing-activation-actions">
                <label className="field-control compact-field">
                  <span>Prepaid term</span>
                  <select
                    value={paymentTermMonths}
                    onChange={event => setPaymentTermMonths(Number(event.currentTarget.value) as 1 | 3 | 6 | 12)}
                  >
                    {[1, 3, 6, 12].map(months => <option key={months} value={months}>{months} {months === 1 ? 'month' : 'months'}</option>)}
                  </select>
                </label>
                <button className="primary-action-link" type="button" onClick={activateSubscription} disabled={activationMutation.isPending}>
                  {activationMutation.isPending ? 'Starting…' : 'Start prepaid subscription'}
                </button>
              </div>
            ) : null}
          </div>
        )}
        {actionError ? <p className="management-error" role="alert">{actionError}</p> : null}
      </section>

      <section className="billing-section" aria-labelledby="seats-heading">
        <div className="billing-section-heading">
          <div>
            <h2 id="seats-heading">Organization seats</h2>
            <p className="field-help">Values below are calculated and returned by the backend.</p>
          </div>
        </div>
        <dl className="billing-seat-grid">
          <div><dt>Active users</dt><dd>{estimate.activeOrganizationUsers}</dd></div>
          <div><dt>Included seats</dt><dd>{estimate.includedUserSeats}</dd></div>
          <div><dt>Additional users</dt><dd>{estimate.additionalUserCount}</dd></div>
          <div><dt>Current monthly estimate</dt><dd>{formatBillingAmount(estimate.monthlyTotal, estimate.currency)}</dd></div>
        </dl>
      </section>

      {pendingAdjustments.length > 0 ? (
        <section className="billing-section" aria-labelledby="adjustments-heading">
          <div className="billing-section-heading">
            <div>
              <h2 id="adjustments-heading">Pending adjustments</h2>
              <p className="field-help">The backend controls which selected users or branches are chargeable and when pending targets become active.</p>
            </div>
          </div>
          <div className="billing-record-list">
            {pendingAdjustments.map(record => (
              <Link className="billing-record-row" href={`/app/billing/${encodeURIComponent(record.id)}`} key={record.id}>
                <span><strong>{record.invoiceNumber}</strong><small>{record.lineItems.map(item => item.description).join(', ') || 'Adjustment'}</small></span>
                <BillingStatus status={record.status} />
                <strong>{formatBillingAmount(record.totalAmount, record.currency)}</strong>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="billing-section" aria-labelledby="records-heading">
        <div className="billing-section-heading">
          <div>
            <h2 id="records-heading">Billing history</h2>
            <p className="field-help">Paid records are read-only.</p>
          </div>
          {user.role === 'OWNER' ? (
            <div className="billing-actions">
              <Link className="secondary-button" href="/app/billing/adjustments/create">Create prepaid adjustment</Link>
              {subscription && (subscription.status === 'TRIAL' || subscription.status === 'ACTIVE') ? (
                <button className="secondary-button" type="button" onClick={generateInvoice} disabled={mutation.isPending}>
                  {mutation.isPending ? 'Generating…' : 'Generate current invoice'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {actionSuccess ? <p className="management-success" role="status">{actionSuccess}</p> : null}
        {records.length === 0 ? (
          <p className="billing-empty-note">No billing records found.</p>
        ) : (
          <div className="user-table-scroll">
            <table className="user-table billing-table">
              <thead>
                <tr>
                  <th scope="col">Invoice</th>
                  <th scope="col">Type</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col">Created</th>
                  <th scope="col">Paid</th>
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr key={record.id}>
                    <td><Link className="table-action" href={`/app/billing/${encodeURIComponent(record.id)}`}>{record.invoiceNumber}</Link></td>
                    <td>{record.billingType}</td>
                    <td>{formatBillingAmount(record.totalAmount, record.currency)}</td>
                    <td><BillingStatus status={record.status} /></td>
                    <td>{formatBillingDate(record.createdAt)}</td>
                    <td>{formatBillingDate(record.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}

export function BillingOverviewPage() {
  return <BillingGate>{user => <BillingOverviewContent user={user} />}</BillingGate>;
}