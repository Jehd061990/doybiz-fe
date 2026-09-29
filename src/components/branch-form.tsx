'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { AccountStatus } from '@/types/auth';
import type { CreateOrganizationBranchValues } from '@/types/user-management';

interface BranchFormProps {
  isSaving: boolean;
  error: string | null;
  success: string | null;
  onSubmit: (values: CreateOrganizationBranchValues) => Promise<boolean | void>;
}

export function BranchForm({ isSaving, error, success, onSubmit }: BranchFormProps) {
  const [status, setStatus] = useState<AccountStatus>('ACTIVE');
  const [validationError, setValidationError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const address = String(formData.get('address') || '').trim();
    const contactNumber = String(formData.get('contactNumber') || '').trim();

    if (!name || !address || !contactNumber) {
      setValidationError('Enter a branch name, address, and contact number.');
      return;
    }

    const succeeded = await onSubmit({ name, address, contactNumber, status });
    if (succeeded !== false) {
      form.reset();
      setStatus('ACTIVE');
    }
  }

  return (
    <form className="user-form" onSubmit={handleSubmit}>
      <section className="form-section" aria-labelledby="branch-information-heading">
        <h2 id="branch-information-heading">Branch information</h2>
        <div className="form-grid">
          <label className="field-control">
            <span>Branch name</span>
            <input name="name" type="text" required />
          </label>
          <label className="field-control">
            <span>Contact number</span>
            <input name="contactNumber" type="tel" required />
          </label>
          <label className="field-control">
            <span>Address</span>
            <input name="address" type="text" required />
          </label>
        </div>
      </section>
      <section className="form-section" aria-labelledby="branch-status-heading">
        <h2 id="branch-status-heading">Branch status</h2>
        <label className="field-control compact-field">
          <span>Status</span>
          <select name="status" value={status} onChange={event => setStatus(event.currentTarget.value as AccountStatus)}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
      </section>
      {validationError || error ? <p className="management-error" role="alert">{validationError || error}</p> : null}
      {success ? <p className="management-success" role="status">{success}</p> : null}
      <div className="form-actions">
        <Link className="secondary-button" href="/app/branches">Cancel</Link>
        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Creating…' : 'Create branch'}
        </button>
      </div>
    </form>
  );
}