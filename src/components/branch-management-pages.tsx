'use client';

import Link from 'next/link';
import { useCreate, type HttpError } from '@refinedev/core';
import { useState } from 'react';
import { useBranches } from '@/lib/branches/use-branches';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getUserManagementErrorMessage } from '@/lib/users/errors';
import type { AuthUser } from '@/types/auth';
import type { CreateOrganizationBranchValues, OrganizationBranch } from '@/types/user-management';
import { BranchForm } from './branch-form';

function BranchManagementGate({
  ownerOnly = false,
  children,
}: {
  ownerOnly?: boolean;
  children: (user: AuthUser) => React.ReactNode;
}) {
  const { session, isLoading, error } = useAuthSession();

  if (isLoading) return <p className="management-state" role="status">Checking access…</p>;
  if (error || !session.authenticated || !session.user) {
    return <p className="management-error" role="alert">Your session could not be verified. Sign in again.</p>;
  }
  if (session.user.role === 'PLATFORM_ADMIN') {
    return <p className="management-error" role="alert">Branch management is available only inside a tenant organization.</p>;
  }
  if (ownerOnly && session.user.role !== 'OWNER') {
    return <section className="management-state" role="alert">
      <h1>Branch creation unavailable</h1>
      <p>Only an organization owner can create branches.</p>
    </section>;
  }
  return children(session.user);
}

function BranchListContent({ user }: { user: AuthUser }) {
  const branchesQuery = useBranches();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  if (branchesQuery.query.isLoading) {
    return <p className="management-state" role="status">Loading organization branches…</p>;
  }
  if (branchesQuery.query.isError) {
    return <p className="management-error" role="alert">
      {getUserManagementErrorMessage(branchesQuery.query.error, 'load', 'branches')}
    </p>;
  }

  const branches = branchesQuery.result.data;
  const normalizedSearch = search.trim().toLowerCase();
  const visibleBranches = branches.filter(branch =>
    (!normalizedSearch
      || branch.name.toLowerCase().includes(normalizedSearch)
      || branch.address.toLowerCase().includes(normalizedSearch)
      || branch.contactNumber.toLowerCase().includes(normalizedSearch))
    && (statusFilter === 'ALL' || branch.status === statusFilter));

  return (
    <section className="management-page" aria-labelledby="branches-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">ORGANIZATION {user.organizationId}</p>
          <h1 id="branches-heading">Branches</h1>
          <p className="management-description">Branches available to your account in this organization.</p>
        </div>
        {user.role === 'OWNER' ? <Link className="primary-action-link" href="/app/branches/create">Create branch</Link> : null}
      </header>

      <div className="user-list-toolbar branch-list-toolbar" aria-label="Filter branches">
        <label className="field-control search-control">
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.currentTarget.value)}
            placeholder="Name, address, or contact"
          />
        </label>
        <label className="field-control filter-control">
          <span>Status</span>
          <select value={statusFilter} onChange={event => setStatusFilter(event.currentTarget.value as typeof statusFilter)}>
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <p className="result-count" role="status">{visibleBranches.length} of {branches.length} branches</p>
      </div>

      {branches.length === 0 ? (
        <div className="empty-state">
          <h2>No branches found.</h2>
          {user.role === 'OWNER'
            ? <p>Create the first branch for this organization.</p>
            : <p>No branches are available to your account.</p>}
          {user.role === 'OWNER' ? <Link className="secondary-button" href="/app/branches/create">Create branch</Link> : null}
        </div>
      ) : visibleBranches.length === 0 ? (
        <p className="management-state">No branches match these filters.</p>
      ) : (
        <div className="user-table-scroll">
          <table className="user-table branch-table">
            <thead>
              <tr>
                <th scope="col">Branch name</th>
                <th scope="col">Address</th>
                <th scope="col">Contact number</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleBranches.map(branch => (
                <tr key={branch.id}>
                  <td><strong>{branch.name}</strong></td>
                  <td>{branch.address}</td>
                  <td>{branch.contactNumber}</td>
                  <td><span className={`status-label status-label-${branch.status.toLowerCase()}`}>{branch.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function BranchCreateContent({ user }: { user: AuthUser }) {
  const { mutateAsync, mutation } = useCreate<OrganizationBranch, HttpError, CreateOrganizationBranchValues>({
    mutationOptions: { gcTime: 0 },
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function createBranch(values: CreateOrganizationBranchValues) {
    setError(null);
    setSuccess(null);
    try {
      await mutateAsync({ resource: 'branches', values });
      setSuccess('Branch created successfully.');
      return true;
    } catch (submitError) {
      setError(getUserManagementErrorMessage(submitError, 'create', 'branches'));
      return false;
    }
  }

  return (
    <section className="management-page" aria-labelledby="create-branch-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">ORGANIZATION {user.organizationId}</p>
          <h1 id="create-branch-heading">Create branch</h1>
        </div>
      </header>
      <BranchForm isSaving={mutation.isPending} error={error} success={success} onSubmit={createBranch} />
    </section>
  );
}

export function BranchListPage() {
  return <BranchManagementGate>{user => <BranchListContent user={user} />}</BranchManagementGate>;
}

export function BranchCreatePage() {
  return <BranchManagementGate ownerOnly>{user => <BranchCreateContent user={user} />}</BranchManagementGate>;
}