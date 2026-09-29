'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCustomMutation, useList, type HttpError } from '@refinedev/core';
import { useBranches } from '@/lib/branches/use-branches';
import { getBillingErrorMessage } from '@/lib/billing/errors';
import type { OrganizationUser } from '@/types/user-management';
import type { BillingRecord, CreatePrepaidAdjustmentValues } from '@/types/billing';
import { BillingGate } from './billing-shared';

interface AdjustmentResponse {
  id?: string;
  success: boolean;
  billing: BillingRecord;
}

function BillingAdjustmentContent() {
  const router = useRouter();
  const usersQuery = useList<OrganizationUser>({ resource: 'users', pagination: { mode: 'off' } });
  const branchesQuery = useBranches();
  const { mutateAsync, mutation } = useCustomMutation<AdjustmentResponse, HttpError, CreatePrepaidAdjustmentValues>({
    mutationOptions: { gcTime: 0 },
  });
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedBranchIds, setSelectedBranchIds] = useState<string[]>([]);
  const [acknowledgedPendingState, setAcknowledgedPendingState] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleSelection(current: string[], id: string, selected: boolean) {
    return selected
      ? current.includes(id) ? current : [...current, id]
      : current.filter(item => item !== id);
  }

  async function createAdjustment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    setError(null);
    if (selectedUserIds.length === 0 && selectedBranchIds.length === 0) {
      setValidationError('Select at least one organization user or branch.');
      return;
    }
    if (!acknowledgedPendingState) {
      setValidationError('Confirm that selected additions may become pending until payment is verified.');
      return;
    }

    try {
      const values: CreatePrepaidAdjustmentValues = {
        userIds: selectedUserIds,
        branchIds: selectedBranchIds,
      };
      const response = await mutateAsync({ url: '/billing/adjustments', method: 'post', values });
      const recordId = response.data.billing.id || response.data.billing._id;
      if (!recordId) {
        setError('The adjustment was created, but its billing record could not be opened. Refresh billing history.');
        return;
      }
      router.push(`/app/billing/${encodeURIComponent(recordId)}`);
    } catch (submitError) {
      setError(getBillingErrorMessage(submitError, 'adjust'));
    }
  }

  if (usersQuery.query.isLoading || branchesQuery.query.isLoading) {
    return <p className="management-state" role="status">Loading organization additions…</p>;
  }
  if (usersQuery.query.isError || branchesQuery.query.isError) {
    return <p className="management-error" role="alert">
      {getBillingErrorMessage(usersQuery.query.error || branchesQuery.query.error)}
    </p>;
  }

  const users = usersQuery.result.data;
  const branches = branchesQuery.result.data;

  return (
    <section className="management-page billing-page" aria-labelledby="adjustment-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">ORGANIZATION BILLING</p>
          <h1 id="adjustment-heading">Create prepaid adjustment</h1>
          <p className="management-description">The backend determines which selected additions are chargeable and returns the resulting billing record.</p>
        </div>
      </header>

      <form className="billing-adjustment-form" onSubmit={createAdjustment}>
        <section className="billing-section" aria-labelledby="users-heading">
          <h2 id="users-heading">Organization users</h2>
          {users.length ? (
            <div className="billing-selection-list">
              {users.map(user => (
                <label className="check-option billing-selection-option" key={user.id}>
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.id)}
                    onChange={event => {
                      const selected = event.currentTarget.checked;
                      setSelectedUserIds(current => toggleSelection(current, user.id, selected));
                    }}
                  />
                  <span><strong>{user.name}</strong><small>{user.email} · {user.status}</small></span>
                </label>
              ))}
            </div>
          ) : <p className="billing-empty-note">No organization users were returned.</p>}
        </section>

        <section className="billing-section" aria-labelledby="branches-heading">
          <h2 id="branches-heading">Branches</h2>
          {branches.length ? (
            <div className="billing-selection-list">
              {branches.map(branch => (
                <label className="check-option billing-selection-option" key={branch.id}>
                  <input
                    type="checkbox"
                    checked={selectedBranchIds.includes(branch.id)}
                    onChange={event => {
                      const selected = event.currentTarget.checked;
                      setSelectedBranchIds(current => toggleSelection(current, branch.id, selected));
                    }}
                  />
                  <span><strong>{branch.name}</strong><small>{branch.address} · {branch.status}</small></span>
                </label>
              ))}
            </div>
          ) : <p className="billing-empty-note">No organization branches were returned.</p>}
        </section>

        <aside className="billing-impact-warning" aria-label="Adjustment impact">
          <strong>Pending status and activation</strong>
          <p>Creating an adjustment may place selected branches and backend-selected chargeable users into pending/inactive status until payment is verified. The backend calculates the amount and applies activation only after verified payment processing.</p>
          <p>If an adjustment is already pending, the backend may merge these targets into that record.</p>
          <label className="check-option">
            <input
              type="checkbox"
              checked={acknowledgedPendingState}
              onChange={event => setAcknowledgedPendingState(event.currentTarget.checked)}
            />
            <span>I understand that selected additions may become pending until payment is verified.</span>
          </label>
        </aside>

        {validationError || error ? <p className="management-error" role="alert">{validationError || error}</p> : null}
        <div className="form-actions">
          <Link className="secondary-button" href="/app/billing">Cancel</Link>
          <button className="primary-button" type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating adjustment…' : 'Create adjustment'}
          </button>
        </div>
      </form>
    </section>
  );
}

export function BillingAdjustmentPage() {
  return <BillingGate ownerOnly>{() => <BillingAdjustmentContent />}</BillingGate>;
}