'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useCustomMutation, useOne, type HttpError } from '@refinedev/core';
import { getBillingErrorMessage } from '@/lib/billing/errors';
import type { BillingRecordDetail, XenditPaymentInitiation } from '@/types/billing';
import { BillingGate, BillingStatus, formatBillingAmount, formatBillingDate } from './billing-shared';

type XenditPaymentResponse = XenditPaymentInitiation & { id?: string; success: boolean };

function getPaymentActionUrl(actions: XenditPaymentInitiation['xenditPayment']['actions']) {
  return actions.find(action => {
    if (!action.url) return false;
    try {
      return new URL(action.url).protocol === 'https:';
    } catch {
      return false;
    }
  })?.url;
}

function BillingRecordContent({ recordId, isOwner }: { recordId: string; isOwner: boolean }) {
  const recordQuery = useOne<BillingRecordDetail>({ resource: 'billing', id: recordId });
  const { mutateAsync, mutation } = useCustomMutation<XenditPaymentResponse, HttpError, Record<string, never>>({
    mutationOptions: { gcTime: 0 },
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null);
  const [paymentActionUrl, setPaymentActionUrl] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] = useState<string | null>(null);

  async function refreshRecord() {
    const response = await recordQuery.query.refetch();
    const currentRecord = response.data?.data;
    if (currentRecord?.status === 'PAID') {
      setPaymentNotice('The backend now reports this billing record as paid.');
      setPaymentActionUrl(null);
      setProviderStatus(null);
    }
  }

  async function startPayment() {
    setActionError(null);
    setPaymentNotice(null);
    setPaymentActionUrl(null);
    setProviderStatus(null);
    try {
      const response = await mutateAsync({
        url: `/billing/${encodeURIComponent(recordId)}/xendit/payment`,
        method: 'post',
        values: {},
      });
      const payment = response.data.xenditPayment;
      setProviderStatus(payment.status);
      setPaymentActionUrl(getPaymentActionUrl(payment.actions) || null);
      setPaymentNotice('Payment request created. The billing record remains unpaid until backend confirmation.');
      await refreshRecord();
    } catch (error) {
      setActionError(getBillingErrorMessage(error, 'payment'));
    }
  }

  if (recordQuery.query.isLoading) return <p className="management-state" role="status">Loading billing record…</p>;
  if (recordQuery.query.isError || !recordQuery.result) {
    return <p className="management-error" role="alert">{getBillingErrorMessage(recordQuery.query.error)}</p>;
  }

  const record = recordQuery.result;
  const canPay = isOwner && (record.status === 'PENDING' || record.status === 'OVERDUE');

  return (
    <section className="management-page billing-page" aria-labelledby="billing-record-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">BILLING RECORD</p>
          <h1 id="billing-record-heading">{record.invoiceNumber}</h1>
          <p className="management-description">{record.billingType} · {formatBillingDate(record.periodStart)} – {formatBillingDate(record.periodEnd)}</p>
        </div>
        <div className="billing-detail-actions">
          <BillingStatus status={record.status} />
          <button className="secondary-button" type="button" onClick={refreshRecord}>Refresh status</button>
        </div>
      </header>

      <div className="billing-record-summary">
        <section className="billing-section" aria-labelledby="amount-heading">
          <h2 id="amount-heading">Amount</h2>
          <dl className="billing-amount-list">
            <div><dt>Subtotal</dt><dd>{formatBillingAmount(record.subtotal, record.currency)}</dd></div>
            {record.setupFee > 0 ? <div><dt>Setup fee</dt><dd>{formatBillingAmount(record.setupFee, record.currency)}</dd></div> : null}
            <div><dt>Branch charges</dt><dd>{formatBillingAmount(record.branchCharges, record.currency)}</dd></div>
            <div><dt>Additional user charges</dt><dd>{formatBillingAmount(record.additionalUserCharges, record.currency)}</dd></div>
            <div className="billing-total-row"><dt>Total</dt><dd>{formatBillingAmount(record.totalAmount, record.currency)}</dd></div>
            <div><dt>Paid amount</dt><dd>{formatBillingAmount(record.paidAmount, record.currency)}</dd></div>
            <div><dt>Outstanding amount</dt><dd>{formatBillingAmount(record.outstandingAmount, record.currency)}</dd></div>
          </dl>
        </section>
        <section className="billing-section" aria-labelledby="dates-heading">
          <h2 id="dates-heading">Dates</h2>
          <dl className="billing-amount-list">
            <div><dt>Created</dt><dd>{formatBillingDate(record.createdAt)}</dd></div>
            <div><dt>Due</dt><dd>{formatBillingDate(record.dueDate)}</dd></div>
            <div><dt>Paid</dt><dd>{formatBillingDate(record.paidAt)}</dd></div>
            <div><dt>Coverage start</dt><dd>{formatBillingDate(record.coverageStart)}</dd></div>
            <div><dt>Coverage end</dt><dd>{formatBillingDate(record.coverageEnd)}</dd></div>
          </dl>
        </section>
      </div>

      {record.lineItems.length ? (
        <section className="billing-section" aria-labelledby="line-items-heading">
          <h2 id="line-items-heading">Line items</h2>
          <div className="user-table-scroll">
            <table className="user-table billing-table">
              <thead><tr><th scope="col">Description</th><th scope="col">Target</th><th scope="col">Branch charge</th><th scope="col">Additional user charge</th><th scope="col">Amount</th></tr></thead>
              <tbody>
                {record.lineItems.map((item, index) => (
                  <tr key={`${item.targetType || item.description}-${index}`}>
                    <td>{item.description}</td>
                    <td>{item.targetType === 'USER' ? 'User' : item.targetType === 'BRANCH' ? 'Branch' : 'Subscription'}</td>
                    <td>{formatBillingAmount(item.branchCharge, record.currency)}</td>
                    <td>{formatBillingAmount(item.additionalUserCharge, record.currency)}</td>
                    <td>{formatBillingAmount(item.amount, record.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="billing-section" aria-labelledby="payments-heading">
        <div className="billing-section-heading">
          <div>
            <h2 id="payments-heading">Payments</h2>
            <p className="field-help">Payment initiation is not payment confirmation. The backend updates status after verified processing.</p>
          </div>
          {canPay ? (
            <button className="primary-action-link billing-pay-button" type="button" onClick={startPayment} disabled={mutation.isPending}>
              {mutation.isPending ? 'Starting payment…' : 'Pay with Xendit'}
            </button>
          ) : null}
        </div>
        {actionError ? <p className="management-error" role="alert">{actionError}</p> : null}
        {paymentNotice ? <p className="management-success" role="status">{paymentNotice}{providerStatus ? ` Provider status: ${providerStatus}.` : ''}</p> : null}
        {paymentActionUrl ? (
          <p className="payment-action-link"><a href={paymentActionUrl} target="_blank" rel="noreferrer">Continue to payment</a></p>
        ) : null}
        {record.payments.length ? (
          <div className="user-table-scroll">
            <table className="user-table billing-table">
              <thead><tr><th scope="col">Amount</th><th scope="col">Method</th><th scope="col">Status</th><th scope="col">Provider status</th><th scope="col">Reference</th><th scope="col">Recorded</th></tr></thead>
              <tbody>
                {record.payments.map((payment, index) => (
                  <tr key={payment.id || payment._id || `${payment.referenceNumber || 'payment'}-${index}`}>
                    <td>{formatBillingAmount(payment.amount, record.currency)}</td>
                    <td>{payment.paymentMethod}</td>
                    <td><BillingStatus status={payment.status} /></td>
                    <td>{payment.providerStatus || '—'}</td>
                    <td>{payment.referenceNumber || payment.providerReferenceId || '—'}</td>
                    <td>{formatBillingDate(payment.createdAt || payment.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="billing-empty-note">No completed payments are recorded for this billing record.</p>
        )}
        {!canPay && (record.status === 'PAID' || record.status === 'VOID')
          ? <p className="billing-readonly-note">This billing record is read-only.</p>
          : null}
      </section>

      <Link className="secondary-button billing-back-link" href="/app/billing">Back to billing</Link>
    </section>
  );
}

export function BillingRecordPage() {
  const params = useParams<{ id: string }>();
  return (
    <BillingGate>
      {user => <BillingRecordContent recordId={params.id} isOwner={user.role === 'OWNER'} />}
    </BillingGate>
  );
}