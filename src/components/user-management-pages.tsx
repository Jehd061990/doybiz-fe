'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCreate, useList, useOne, useUpdate, type HttpError } from '@refinedev/core';
import { useState } from 'react';
import { ROLES, type UserRole } from '@/config/roles';
import { useBranches } from '@/lib/branches/use-branches';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getUserManagementErrorMessage } from '@/lib/users/errors';
import type { AuthUser } from '@/types/auth';
import type { CreateOrganizationUserValues, OrganizationUser, UpdateOrganizationUserValues } from '@/types/user-management';
import { UserForm } from './user-form';

function UserManagementGate({ children }: { children: (user: AuthUser) => React.ReactNode }) {
  const { session, isLoading, error } = useAuthSession();

  if (isLoading) return <p className="management-state" role="status">Checking access…</p>;
  if (error || !session.authenticated || !session.user) {
    return <p className="management-error" role="alert">Your session could not be verified. Sign in again.</p>;
  }
  if (session.user.role !== 'OWNER') {
    return <section className="management-state" role="alert">
      <h1>User management unavailable</h1>
      <p>Only an organization owner can manage users.</p>
    </section>;
  }
  return children(session.user);
}

function UserListContent() {
  const usersQuery = useList<OrganizationUser>({ resource: 'users', pagination: { mode: 'off' } });
  const branchesQuery = useBranches();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  if (usersQuery.query.isLoading || branchesQuery.query.isLoading) {
    return <p className="management-state" role="status">Loading organization users…</p>;
  }
  if (usersQuery.query.isError || branchesQuery.query.isError) {
    const error = usersQuery.query.error || branchesQuery.query.error;
    return <p className="management-error" role="alert">{getUserManagementErrorMessage(error)}</p>;
  }

  const users = usersQuery.result.data;
  const branches = branchesQuery.result.data;
  const branchNames = new Map(branches.map(branch => [branch.id, branch.name]));
  const normalizedSearch = search.trim().toLowerCase();
  const visibleUsers = users.filter(user => {
    const matchesSearch = !normalizedSearch
      || user.name.toLowerCase().includes(normalizedSearch)
      || user.email.toLowerCase().includes(normalizedSearch);
    return matchesSearch
      && (roleFilter === 'ALL' || user.role === roleFilter)
      && (statusFilter === 'ALL' || user.status === statusFilter);
  });

  return (
    <section className="management-page" aria-labelledby="users-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">ORGANIZATION</p>
          <h1 id="users-heading">Users</h1>
          <p className="management-description">Manage each user’s role, branch access, module permissions, and account status.</p>
        </div>
        <Link className="primary-action-link" href="/app/users/create">Create user</Link>
      </header>

      <div className="user-list-toolbar" aria-label="Filter users">
        <label className="field-control search-control">
          <span>Search</span>
          <input
            type="search"
            value={search}
            onChange={event => setSearch(event.currentTarget.value)}
            placeholder="Name or email"
          />
        </label>
        <label className="field-control filter-control">
          <span>Role</span>
          <select value={roleFilter} onChange={event => setRoleFilter(event.currentTarget.value as UserRole | 'ALL')}>
            <option value="ALL">All roles</option>
            {ROLES.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
        </label>
        <label className="field-control filter-control">
          <span>Status</span>
          <select value={statusFilter} onChange={event => setStatusFilter(event.currentTarget.value as typeof statusFilter)}>
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </label>
        <p className="result-count" role="status">{visibleUsers.length} of {users.length} users</p>
      </div>

      {users.length === 0 ? (
        <div className="empty-state">
          <h2>No users found.</h2>
          <p>Create a user to give a team member access to this organization.</p>
          <Link className="secondary-button" href="/app/users/create">Create user</Link>
        </div>
      ) : visibleUsers.length === 0 ? (
        <p className="management-state">No users match these filters.</p>
      ) : (
        <div className="user-table-scroll">
          <table className="user-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Branch access</th>
                <th scope="col">Effective modules</th>
                <th scope="col"><span className="visually-hidden">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map(user => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong><span className="table-secondary">{user.email}</span></td>
                  <td>{user.role}</td>
                  <td><span className={`status-label status-label-${user.status.toLowerCase()}`}>{user.status}</span></td>
                  <td>{user.branchAccess === 'ALL'
                    ? 'All branches'
                    : user.branchAccess.length
                      ? user.branchAccess.map(id => branchNames.get(id) || 'Unavailable branch').join(', ')
                      : 'No branches assigned'}</td>
                  <td>{user.modulePermissions.length ? user.modulePermissions.join(', ') : 'None'}</td>
                  <td><Link className="table-action" href={`/app/users/${encodeURIComponent(user.id)}`}>View / edit</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function UserCreateContent({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const branchesQuery = useBranches();
  const { mutateAsync, mutation } = useCreate<OrganizationUser, HttpError, CreateOrganizationUserValues>({
    mutationOptions: { gcTime: 0 },
  });
  const [error, setError] = useState<string | null>(null);

  async function saveUser(values: CreateOrganizationUserValues | UpdateOrganizationUserValues) {
    setError(null);
    try {
      await mutateAsync({ resource: 'users', values: values as CreateOrganizationUserValues });
      router.replace('/app/users');
      return true;
    } catch (submitError) {
      setError(getUserManagementErrorMessage(submitError, 'create'));
      return false;
    }
  }

  if (branchesQuery.query.isLoading) return <p className="management-state" role="status">Loading organization branches…</p>;
  if (branchesQuery.query.isError) {
    return <p className="management-error" role="alert">{getUserManagementErrorMessage(branchesQuery.query.error)}</p>;
  }

  return (
    <section className="management-page" aria-labelledby="create-user-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">USER MANAGEMENT</p>
          <h1 id="create-user-heading">Create user</h1>
          <p className="management-description">The account will belong to your authenticated organization.</p>
        </div>
      </header>
      <UserForm
        mode="create"
        branches={branchesQuery.result.data}
        organizationId={organizationId}
        isSaving={mutation.isPending}
        error={error}
        onSubmit={saveUser}
      />
    </section>
  );
}

function UserEditContent({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params.id;
  const userQuery = useOne<OrganizationUser>({ resource: 'users', id: userId });
  const branchesQuery = useBranches();
  const { mutateAsync, mutation } = useUpdate<OrganizationUser, HttpError, UpdateOrganizationUserValues>({
    resource: 'users',
    id: userId,
  });
  const [error, setError] = useState<string | null>(null);

  async function saveUser(values: CreateOrganizationUserValues | UpdateOrganizationUserValues) {
    setError(null);
    try {
      await mutateAsync({ resource: 'users', id: userId, values: values as UpdateOrganizationUserValues });
      router.replace('/app/users');
      return true;
    } catch (submitError) {
      setError(getUserManagementErrorMessage(submitError, 'update'));
      return false;
    }
  }

  if (userQuery.query.isLoading || branchesQuery.query.isLoading) {
    return <p className="management-state" role="status">Loading user details…</p>;
  }
  if (userQuery.query.isError || branchesQuery.query.isError || !userQuery.result) {
    const queryError = userQuery.query.error || branchesQuery.query.error;
    return <p className="management-error" role="alert">{getUserManagementErrorMessage(queryError)}</p>;
  }

  return (
    <section className="management-page" aria-labelledby="edit-user-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">USER MANAGEMENT</p>
          <h1 id="edit-user-heading">User details</h1>
          <p className="management-description">Edit identity and access settings independently.</p>
        </div>
      </header>
      <UserForm
        key={userId}
        mode="edit"
        branches={branchesQuery.result.data}
        organizationId={organizationId}
        initialUser={userQuery.result}
        isSaving={mutation.isPending}
        error={error}
        onSubmit={saveUser}
      />
    </section>
  );
}

export function UserListPage() {
  return <UserManagementGate>{() => <UserListContent />}</UserManagementGate>;
}

export function UserCreatePage() {
  return <UserManagementGate>{user => <UserCreateContent organizationId={user.organizationId} />}</UserManagementGate>;
}

export function UserEditPage() {
  return <UserManagementGate>{user => <UserEditContent organizationId={user.organizationId} />}</UserManagementGate>;
}