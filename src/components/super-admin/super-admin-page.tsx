'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiRequest } from '@/lib/api/client';
import type { ModuleName } from '@/config/modules';

type Organization = {
  _id: string; name: string; slug?: string; email: string; phone: string; address: string; status: 'ACTIVE' | 'INACTIVE';
  includedBranchCount: number; includedUserSeats: number; additionalUserSeatsPerBranch: number; additionalUserSeats: number;
};
type Branch = { _id: string; name: string; address: string; contactNumber: string; status: 'ACTIVE' | 'INACTIVE' };
type TenantUser = {
  _id: string; name: string; email: string; role: 'OWNER' | 'MANAGER' | 'CASHIER';
  branchAccess: string[] | 'ALL'; modulePermissions: ModuleName[]; permissionPreset?: 'OWNER' | 'MANAGER' | 'CASHIER'; status: 'ACTIVE' | 'INACTIVE';
};
type OrganizationsResponse = { success: true; organizations: Organization[] };
type BranchesResponse = { success: true; branches: Branch[] };
type UsersResponse = { success: true; users: TenantUser[] };

const MODULES: ModuleName[] = ['POS', 'SALES', 'APPOINTMENTS', 'CUSTOMERS', 'REPORTS', 'STAFF', 'BILLING'];
const PRESETS: Record<'OWNER' | 'MANAGER' | 'CASHIER', ModuleName[]> = {
  OWNER: [...MODULES],
  MANAGER: ['POS', 'SALES', 'APPOINTMENTS', 'CUSTOMERS', 'REPORTS', 'STAFF'],
  CASHIER: ['POS', 'SALES', 'APPOINTMENTS', 'CUSTOMERS'],
};

export function SuperAdminPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [message, setMessage] = useState('');
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [loadingOrgData, setLoadingOrgData] = useState(false);
  const [creatingOrganization, setCreatingOrganization] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [showTemporaryPassword, setShowTemporaryPassword] = useState(false);
  const [showCreateOrganization, setShowCreateOrganization] = useState(false);
  const [organizationStep, setOrganizationStep] = useState(1);
  const [organizationDetails, setOrganizationDetails] = useState<Organization | null>(null);
  const [editingOrganization, setEditingOrganization] = useState(false);
  const [savingOrganization, setSavingOrganization] = useState(false);
  const [organizationEditStatus, setOrganizationEditStatus] = useState<Organization['status']>('ACTIVE');
  const [organizationModalTab, setOrganizationModalTab] = useState<'details' | 'branches' | 'users'>('details');
  const [orgForm, setOrgForm] = useState({ name: '', slug: '', email: '', phone: '', address: '', includedBranchCount: '1', includedUserSeats: '3', additionalUserSeatsPerBranch: '3', additionalUserSeats: '0' });
  const [branchForm, setBranchForm] = useState({ name: '', address: '', contactNumber: '' });
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: 'CASHIER' as 'OWNER' | 'MANAGER' | 'CASHIER',
    permissionPreset: 'CASHIER' as 'OWNER' | 'MANAGER' | 'CASHIER', branchAccess: [] as string[], modulePermissions: PRESETS.CASHIER,
  });

  const selectedOrg = useMemo(() => organizations.find(org => org._id === selectedOrgId), [organizations, selectedOrgId]);

  const loadOrganizations = async () => {
    setLoadingOrganizations(true);
    try {
      const response = await apiRequest<OrganizationsResponse>('/platform/organizations');
      setOrganizations(response.organizations);
    } finally {
      setLoadingOrganizations(false);
    }
  };

  const loadOrgData = async (organizationId: string) => {
    setLoadingOrgData(true);
    try {
      const [branchResponse, userResponse] = await Promise.all([
        apiRequest<BranchesResponse>(`/platform/organizations/${organizationId}/branches`),
        apiRequest<UsersResponse>(`/platform/organizations/${organizationId}/users`),
      ]);
      setBranches(branchResponse.branches);
      setUsers(userResponse.users);
    } finally {
      setLoadingOrgData(false);
    }
  };

  useEffect(() => { void loadOrganizations().catch(error => setMessage(error instanceof Error ? error.message : 'Failed to load organizations.')); }, []);
  useEffect(() => {
    if (!selectedOrgId) { setBranches([]); setUsers([]); return; }
    void loadOrgData(selectedOrgId).catch(error => setMessage(error instanceof Error ? error.message : 'Failed to load organization data.'));
  }, [selectedOrgId]);

  const saveOrganization = async (event: FormEvent) => {
    event.preventDefault();
    if (!organizationDetails) return;
    setMessage('');
    setSavingOrganization(true);
    try {
      const response = await apiRequest<{ success: true; organization: Organization }>(
        `/platform/organizations/${organizationDetails._id}`,
        { method: 'PATCH', body: { ...orgForm, includedBranchCount: Number(orgForm.includedBranchCount), includedUserSeats: Number(orgForm.includedUserSeats), additionalUserSeatsPerBranch: Number(orgForm.additionalUserSeatsPerBranch), additionalUserSeats: Number(orgForm.additionalUserSeats), status: organizationEditStatus } },
      );
      setOrganizationDetails(response.organization);
      setOrganizationEditStatus(response.organization.status);
      setOrganizations(current => current.map(org => org._id === response.organization._id ? response.organization : org));
      setEditingOrganization(false);
      setMessage('Organization updated.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to update organization.');
    } finally {
      setSavingOrganization(false);
    }
  };

  const createOrganization = async (event: FormEvent) => {
    event.preventDefault(); setMessage(''); setCreatingOrganization(true);
    try {
      await apiRequest('/platform/organizations', { method: 'POST', body: orgForm });
      setOrgForm({ name: '', slug: '', email: '', phone: '', address: '', includedBranchCount: '1', includedUserSeats: '3', additionalUserSeatsPerBranch: '3', additionalUserSeats: '0' });
      setOrganizationStep(1);
      setShowCreateOrganization(false);
      await loadOrganizations(); setMessage('Organization created.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Failed to create organization.'); }
    finally { setCreatingOrganization(false); }
  };

  const createBranch = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedOrgId) return; setMessage(''); setCreatingBranch(true);
    try {
      await apiRequest(`/platform/organizations/${selectedOrgId}/branches`, { method: 'POST', body: branchForm });
      setBranchForm({ name: '', address: '', contactNumber: '' }); await loadOrgData(selectedOrgId); setMessage('Branch created.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Failed to create branch.'); }
    finally { setCreatingBranch(false); }
  };

  const createUser = async (event: FormEvent) => {
    event.preventDefault(); if (!selectedOrgId) return; setMessage(''); setCreatingUser(true);
    const branchAccess = userForm.role === 'OWNER' ? 'ALL' : userForm.branchAccess;
    try {
      await apiRequest(`/platform/organizations/${selectedOrgId}/users`, {
        method: 'POST',
        body: { ...userForm, branchAccess, modulePermissions: userForm.modulePermissions },
      });
      setUserForm({ name: '', email: '', password: '', role: 'CASHIER', permissionPreset: 'CASHIER', branchAccess: [], modulePermissions: PRESETS.CASHIER });
      setShowTemporaryPassword(false);
      await loadOrgData(selectedOrgId); setMessage('User created.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Failed to create user.'); }
    finally { setCreatingUser(false); }
  };

  const changeRole = (role: 'OWNER' | 'MANAGER' | 'CASHIER') => {
    setUserForm(prev => ({
      ...prev,
      role,
      permissionPreset: role,
      modulePermissions: [...PRESETS[role]],
      branchAccess: role === 'OWNER' ? [] : prev.branchAccess,
    }));
  };

  const applyPreset = (preset: 'OWNER' | 'MANAGER' | 'CASHIER') => {
    if (userForm.role === 'OWNER' && preset !== 'OWNER') return;
    setUserForm(prev => ({ ...prev, permissionPreset: preset, modulePermissions: [...PRESETS[preset]] }));
  };

  const permissionsMatchPreset = userForm.modulePermissions.length === PRESETS[userForm.permissionPreset].length
    && PRESETS[userForm.permissionPreset].every(module => userForm.modulePermissions.includes(module));

  return (
    <section className="management-page super-admin-page" aria-labelledby="super-admin-heading">
      <header className="management-page-header">
        <div>
          <p className="eyebrow">PLATFORM ADMINISTRATION</p>
          <h1 id="super-admin-heading">Super Admin</h1>
          <p className="management-description">Provision tenants in a controlled flow: create the organization, add its branches, then create tenant users with role, branch, and module access.</p>
        </div>
      </header>

      {message ? <p className="management-success" role="status">{message}</p> : null}

      <div className="super-admin-stats" aria-label="Platform overview">
        <div><span>Organizations</span><strong>{organizations.length}</strong></div>
        <div><span>Selected branches</span><strong>{selectedOrg ? branches.length : '—'}</strong></div>
        <div><span>Selected users</span><strong>{selectedOrg ? users.length : '—'}</strong></div>
      </div>

      <section className="management-card super-admin-context-card">
        <div className="management-card-heading">
          <div><p className="eyebrow">TENANT MANAGEMENT</p><h2>Organizations</h2><p className="section-description">Select an organization to manage its branches and tenant users.</p></div>
          <div className="super-admin-header-actions">
            <button type="button" className="secondary-button" onClick={() => void loadOrganizations()} disabled={loadingOrganizations}>{loadingOrganizations ? 'Refreshing…' : 'Refresh'}</button>
            <button type="button" className="primary-button" onClick={() => { setOrganizationStep(1); setShowCreateOrganization(true); }}>+ Add organization</button>
          </div>
        </div>
        {loadingOrganizations ? <p className="empty-state">Loading organizations…</p> : organizations.length === 0 ? (
          <div className="super-admin-empty-organizations"><p className="empty-state">No organizations have been provisioned yet.</p><button type="button" className="primary-button" onClick={() => { setOrganizationStep(1); setShowCreateOrganization(true); }}>Add your first organization</button></div>
        ) : (
          <div className="organization-table-scroll"><table className="organization-table"><thead><tr><th>Organization</th><th>Contact</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead><tbody>
            {organizations.map(org => <tr key={org._id}><td><strong>{org.name}</strong><span className="table-secondary">{org.slug ? `/${org.slug}` : 'No slug'}</span></td><td>{org.email}</td><td>{org.phone}</td><td><span className={`status-label ${org.status === 'ACTIVE' ? 'status-label-active' : 'status-label-inactive'}`}>{org.status}</span></td><td><button type="button" className="table-action-button" onClick={() => { setSelectedOrgId(org._id); setOrganizationDetails(org); setOrganizationModalTab('details'); }}>View details</button></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      {organizationDetails ? (
        <div className="super-admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !savingOrganization && !creatingBranch && !creatingUser) { setEditingOrganization(false); setOrganizationDetails(null); } }}>
          <section className="super-admin-modal super-admin-organization-modal" role="dialog" aria-modal="true" aria-labelledby="organization-details-heading">
            <div className="management-card-heading"><div><p className="eyebrow">ORGANIZATION WORKSPACE</p><h2 id="organization-details-heading">{organizationDetails.name}</h2></div><button type="button" className="modal-close-button" onClick={() => { setEditingOrganization(false); setOrganizationDetails(null); }} disabled={savingOrganization || creatingBranch || creatingUser} aria-label="Close organization">×</button></div>
            <div className="organization-modal-summary"><span>{organizationDetails.email}</span><span>{organizationDetails.phone}</span><span>{branches.length} branch{branches.length === 1 ? '' : 'es'}</span><span>{users.length} user{users.length === 1 ? '' : 's'}</span></div>
            <div className="organization-modal-tabs" role="tablist" aria-label="Organization management">
              <button type="button" role="tab" aria-selected={organizationModalTab === 'details'} className={organizationModalTab === 'details' ? 'organization-modal-tab organization-modal-tab-active' : 'organization-modal-tab'} onClick={() => setOrganizationModalTab('details')}>Organization</button>
              <button type="button" role="tab" aria-selected={organizationModalTab === 'branches'} className={organizationModalTab === 'branches' ? 'organization-modal-tab organization-modal-tab-active' : 'organization-modal-tab'} onClick={() => setOrganizationModalTab('branches')}>Branches <span>{branches.length}</span></button>
              <button type="button" role="tab" aria-selected={organizationModalTab === 'users'} className={organizationModalTab === 'users' ? 'organization-modal-tab organization-modal-tab-active' : 'organization-modal-tab'} onClick={() => setOrganizationModalTab('users')}>Tenant Users <span>{users.length}</span></button>
            </div>
            {loadingOrgData ? <p className="empty-state">Loading organization data…</p> : null}
            {organizationModalTab === 'details' ? (
              editingOrganization ? (
                <form onSubmit={saveOrganization} className="management-form super-admin-form">
                  <div className="form-field-group"><h3>Company information</h3><div className="form-grid"><label className="field-control"><span>Organization name</span><input autoFocus value={orgForm.name} required onChange={e => setOrgForm(prev => ({ ...prev, name: e.target.value }))} /></label><label className="field-control"><span>Slug <em>(optional)</em></span><input value={orgForm.slug} onChange={e => setOrgForm(prev => ({ ...prev, slug: e.target.value }))} /></label></div></div>
                  <div className="form-field-group"><h3>Provisioning</h3><div className="form-grid"><label className="field-control"><span>Initial included branches</span><input type="number" min="0" value={orgForm.includedBranchCount} onChange={e => setOrgForm(prev => ({ ...prev, includedBranchCount: e.target.value }))} /></label><label className="field-control"><span>Included user seats</span><input type="number" min="0" value={orgForm.includedUserSeats} onChange={e => setOrgForm(prev => ({ ...prev, includedUserSeats: e.target.value }))} /></label><label className="field-control"><span>Users per additional branch</span><input type="number" min="0" value={orgForm.additionalUserSeatsPerBranch} onChange={e => setOrgForm(prev => ({ ...prev, additionalUserSeatsPerBranch: e.target.value }))} /></label><label className="field-control"><span>Additional user seats</span><input type="number" min="0" value={orgForm.additionalUserSeats} onChange={e => setOrgForm(prev => ({ ...prev, additionalUserSeats: e.target.value }))} /></label></div><p className="field-help">Default: 1 branch = 3 included users. Each branch above the provisioned baseline adds the configured seats.</p></div><div className="form-field-group"><h3>Contact details</h3><div className="form-grid"><label className="field-control"><span>Email</span><input type="email" value={orgForm.email} required onChange={e => setOrgForm(prev => ({ ...prev, email: e.target.value }))} /></label><label className="field-control"><span>Phone</span><input value={orgForm.phone} required onChange={e => setOrgForm(prev => ({ ...prev, phone: e.target.value }))} /></label><label className="field-control full-width"><span>Address</span><input value={orgForm.address} required onChange={e => setOrgForm(prev => ({ ...prev, address: e.target.value }))} /></label><label className="field-control"><span>Status</span><select value={organizationEditStatus} onChange={e => setOrganizationEditStatus(e.target.value as Organization['status'])}><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></label></div></div>
                  <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setEditingOrganization(false)} disabled={savingOrganization}>Cancel</button><button type="submit" className="primary-button" disabled={savingOrganization}>{savingOrganization ? 'Saving…' : 'Save changes'}</button></div>
                </form>
              ) : (
                <div className="organization-modal-content"><div className="organization-detail-grid"><div><span>Organization name</span><strong>{organizationDetails.name}</strong></div><div><span>Slug</span><strong>{organizationDetails.slug ? '/' + organizationDetails.slug : '—'}</strong></div><div><span>Email</span><strong>{organizationDetails.email}</strong></div><div><span>Phone</span><strong>{organizationDetails.phone}</strong></div><div className="organization-detail-full"><span>Address</span><strong>{organizationDetails.address}</strong></div><div><span>Status</span><strong>{organizationDetails.status}</strong></div></div><div className="form-actions"><button type="button" className="primary-button" onClick={() => { setOrgForm({ name: organizationDetails.name, slug: organizationDetails.slug || '', email: organizationDetails.email, phone: organizationDetails.phone, address: organizationDetails.address, includedBranchCount: String(organizationDetails.includedBranchCount ?? 1), includedUserSeats: String(organizationDetails.includedUserSeats ?? 3), additionalUserSeatsPerBranch: String(organizationDetails.additionalUserSeatsPerBranch ?? 3), additionalUserSeats: String(organizationDetails.additionalUserSeats ?? 0) }); setOrganizationEditStatus(organizationDetails.status); setEditingOrganization(true); }}>Manage organization</button></div></div>
              )
            ) : null}
            {organizationModalTab === 'branches' ? (
              <div className="organization-modal-content"><div className="management-card-heading"><div><p className="eyebrow">BRANCHES</p><h3>Add branch</h3><p className="section-description">Add a physical location for this organization.</p></div></div>
                <form onSubmit={createBranch} className="management-form super-admin-form"><div className="form-grid"><label className="field-control"><span>Branch name</span><input value={branchForm.name} onChange={e => setBranchForm(prev => ({ ...prev, name: e.target.value }))} required /></label><label className="field-control"><span>Contact number</span><input value={branchForm.contactNumber} onChange={e => setBranchForm(prev => ({ ...prev, contactNumber: e.target.value }))} required /></label><label className="field-control full-width"><span>Address</span><input value={branchForm.address} onChange={e => setBranchForm(prev => ({ ...prev, address: e.target.value }))} required /></label></div><div className="form-actions"><button type="submit" className="primary-button" disabled={creatingBranch}>{creatingBranch ? 'Adding…' : '+ Add branch'}</button></div></form>
                {branches.length ? <ul className="provisioning-list">{branches.map(branch => <li key={branch._id}><strong>{branch.name}</strong><span>{branch.address} · {branch.contactNumber}</span><small>{branch.status}</small></li>)}</ul> : <p className="empty-state compact-empty">No branches yet.</p>}
              </div>
            ) : null}
            {organizationModalTab === 'users' ? (
              <div className="organization-modal-content"><div className="management-card-heading"><div><p className="eyebrow">TENANT USERS</p><h3>Create tenant user</h3><p className="section-description">Configure role, preset, branch access, and module permissions.</p></div></div>
                {(() => {
                  const activeBranches = branches.filter(branch => branch.status === 'ACTIVE').length;
                  const activeUsers = users.filter(user => user.status === 'ACTIVE').length;
                  const includedSeats = (organizationDetails.includedUserSeats ?? 3) + Math.max(0, activeBranches - (organizationDetails.includedBranchCount ?? 1)) * (organizationDetails.additionalUserSeatsPerBranch ?? 3) + (organizationDetails.additionalUserSeats ?? 0);
                  const availableSeats = Math.max(0, includedSeats - activeUsers);
                  return <div className="user-seat-summary"><div><span>Active branches</span><strong>{activeBranches}</strong></div><div><span>Included seats</span><strong>{includedSeats}</strong></div><div><span>Additional provisioned</span><strong>{organizationDetails.additionalUserSeats ?? 0}</strong></div><div><span>Available seats</span><strong>{availableSeats}</strong></div></div>;
                })()}
                <form onSubmit={createUser} className="management-form super-admin-form"><div className="form-field-group"><h3>User information</h3><div className="form-grid"><label className="field-control"><span>Full name</span><input value={userForm.name} onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))} required /></label><label className="field-control"><span>Email</span><input type="email" value={userForm.email} onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))} required /></label><label className="field-control full-width"><span>Temporary password</span><div className="super-admin-password-field"><input className="super-admin-password-input" type={showTemporaryPassword ? 'text' : 'password'} minLength={8} value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} required /><button type="button" className="super-admin-password-toggle" onClick={() => setShowTemporaryPassword(current => !current)} aria-label={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'}>{showTemporaryPassword ? '◉' : '◯'}</button></div></label></div></div>
                  <div className="form-field-group"><h3>Role & permission preset</h3><div className="form-grid"><label className="field-control"><span>Role</span><select value={userForm.role} onChange={e => changeRole(e.target.value as TenantUser['role'])}>{['OWNER','MANAGER','CASHIER'].map(role => <option key={role}>{role}</option>)}</select></label><div className="field-control"><span>Permission preset</span><div className="preset-button-row" role="group" aria-label="Permission preset">{(['OWNER','MANAGER','CASHIER'] as const).map(preset => <button key={preset} type="button" className={userForm.permissionPreset === preset ? 'preset-button preset-button-active' : 'preset-button'} aria-pressed={userForm.permissionPreset === preset} disabled={userForm.role === 'OWNER' && preset !== 'OWNER'} onClick={() => applyPreset(preset)}>{preset}</button>)}</div><small className="field-help">{permissionsMatchPreset ? userForm.permissionPreset + ' preset applied. Modules are populated automatically.' : 'Manual module override active.'}</small></div></div></div>
                  <div className="form-field-group"><h3>Access control</h3><div className="access-control-grid"><fieldset className="management-fieldset"><legend>Branch access</legend>{userForm.role !== 'OWNER' ? branches.length ? <div className="branch-access-list">{branches.map(branch => <label key={branch._id} className="check-option"><input type="checkbox" checked={userForm.branchAccess.includes(branch._id)} onChange={e => setUserForm(prev => ({ ...prev, branchAccess: e.target.checked ? [...prev.branchAccess, branch._id] : prev.branchAccess.filter(id => id !== branch._id) }))} />{branch.name}</label>)}</div> : <p className="field-help">Add a branch before assigning access.</p> : <p className="owner-access-note">OWNER receives <strong>ALL</strong> branch access automatically.</p>}</fieldset><fieldset className="management-fieldset"><legend>Module permissions</legend><p className="field-help">Preset fills these automatically; manual assignment remains available.</p><div className="module-permission-grid">{MODULES.map(module => <label key={module} className="check-option"><input type="checkbox" checked={userForm.modulePermissions.includes(module)} onChange={e => setUserForm(prev => ({ ...prev, modulePermissions: e.target.checked ? [...prev.modulePermissions, module] : prev.modulePermissions.filter(item => item !== module) }))} />{module}</label>)}</div></fieldset></div></div>
                  <div className="form-actions">{(() => {
                    const activeBranches = branches.filter(branch => branch.status === 'ACTIVE').length;
                    const activeUsers = users.filter(user => user.status === 'ACTIVE').length;
                    const includedSeats = (organizationDetails.includedUserSeats ?? 3) + Math.max(0, activeBranches - (organizationDetails.includedBranchCount ?? 1)) * (organizationDetails.additionalUserSeatsPerBranch ?? 3) + (organizationDetails.additionalUserSeats ?? 0);
                    const availableSeats = Math.max(0, includedSeats - activeUsers);
                    const noAvailableSeats = availableSeats <= 0;
                    return <span title={noAvailableSeats ? 'No available seats. Provision additional user seats before creating a tenant user.' : undefined}><button type="submit" className="primary-button" disabled={creatingUser || noAvailableSeats} aria-disabled={noAvailableSeats}>{creatingUser ? 'Creating…' : noAvailableSeats ? 'No available seats' : 'Create tenant user'}</button></span>;
                  })()}</div></form>
                {users.length ? <div className="user-table-scroll"><table className="user-table"><thead><tr><th>User</th><th>Role</th><th>Preset</th><th>Branch access</th><th>Modules</th><th>Status</th></tr></thead><tbody>{users.map(user => <tr key={user._id}><td><strong>{user.name}</strong><span className="table-secondary">{user.email}</span></td><td>{user.role}</td><td>{user.permissionPreset || user.role}</td><td>{user.branchAccess === 'ALL' ? 'ALL branches' : user.branchAccess.length + ' branch' + (user.branchAccess.length === 1 ? '' : 'es')}</td><td>{user.modulePermissions.length} / {MODULES.length}</td><td>{user.status}</td></tr>)}</tbody></table></div> : <p className="empty-state compact-empty">No tenant users yet.</p>}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
      {showCreateOrganization ? (
        <div className="super-admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !creatingOrganization) setShowCreateOrganization(false); }}>
          <section className="super-admin-modal super-admin-create-modal" role="dialog" aria-modal="true" aria-labelledby="create-organization-heading">
            <div className="management-card-heading"><div><p className="eyebrow">NEW TENANT</p><h2 id="create-organization-heading">Add organization</h2></div><button type="button" className="modal-close-button" onClick={() => setShowCreateOrganization(false)} disabled={creatingOrganization} aria-label="Close add organization">×</button></div>
            <div className="organization-stepper" aria-label="Organization creation steps">
              <div className={organizationStep >= 1 ? 'organization-step organization-step-active' : 'organization-step'}><span>1</span><div><strong>Company</strong><small>Identity</small></div></div>
              <div className={organizationStep >= 2 ? 'organization-step organization-step-active' : 'organization-step'}><span>2</span><div><strong>Contact</strong><small>Details & review</small></div></div>
            </div>
            <form onSubmit={createOrganization} className="management-form super-admin-form">
              {organizationStep === 1 ? (
                <div className="form-field-group"><h3>Company information</h3><div className="form-grid">
                  <label className="field-control"><span>Organization name</span><input autoFocus value={orgForm.name} required onChange={e => setOrgForm(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. ABC Salon & Spa" /></label>
                  <label className="field-control"><span>Slug <em>(optional)</em></span><input value={orgForm.slug} onChange={e => setOrgForm(prev => ({ ...prev, slug: e.target.value }))} placeholder="e.g. abc-salon" /></label>
                </div><div className="form-actions"><button type="button" className="primary-button" disabled={!orgForm.name.trim()} onClick={() => setOrganizationStep(2)}>Continue</button></div></div>
              ) : (
                <div className="form-field-group"><h3>Contact details</h3><div className="form-grid">
                  <label className="field-control"><span>Email</span><input type="email" value={orgForm.email} required onChange={e => setOrgForm(prev => ({ ...prev, email: e.target.value }))} placeholder="business@example.com" /></label>
                  <label className="field-control"><span>Phone</span><input value={orgForm.phone} required onChange={e => setOrgForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="+63 9XX XXX XXXX" /></label>
                  <label className="field-control full-width"><span>Address</span><input value={orgForm.address} required onChange={e => setOrgForm(prev => ({ ...prev, address: e.target.value }))} placeholder="Business address" /></label>
                </div><div className="organization-review"><p className="eyebrow">REVIEW</p><strong>{orgForm.name}</strong><span>{orgForm.slug ? `/${orgForm.slug}` : 'No slug'} · {orgForm.email || 'No email yet'}</span><span>{orgForm.includedBranchCount} included branches · {orgForm.includedUserSeats} base users · +{orgForm.additionalUserSeatsPerBranch} per additional branch · +{orgForm.additionalUserSeats} additional user seats</span></div>
                <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setOrganizationStep(1)} disabled={creatingOrganization}>Back</button><button type="submit" className="primary-button" disabled={creatingOrganization}>{creatingOrganization ? 'Creating…' : 'Create organization'}</button></div></div>
              )}
            </form>
          </section>
        </div>
      ) : null}


    </section>
  );
}
