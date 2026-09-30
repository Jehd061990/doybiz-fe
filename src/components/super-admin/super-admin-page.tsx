'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { apiRequest } from '@/lib/api/client';
import type { ModuleName } from '@/config/modules';

type Organization = {
  _id: string; name: string; slug?: string; email: string; phone: string; address: string; status: 'ACTIVE' | 'INACTIVE';
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
  const [orgForm, setOrgForm] = useState({ name: '', slug: '', email: '', phone: '', address: '' });
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

  const createOrganization = async (event: FormEvent) => {
    event.preventDefault(); setMessage(''); setCreatingOrganization(true);
    try {
      await apiRequest('/platform/organizations', { method: 'POST', body: orgForm });
      setOrgForm({ name: '', slug: '', email: '', phone: '', address: '' });
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
            {organizations.map(org => <tr key={org._id}><td><strong>{org.name}</strong><span className="table-secondary">{org.slug ? `/${org.slug}` : 'No slug'}</span></td><td>{org.email}</td><td>{org.phone}</td><td><span className={`status-label ${org.status === 'ACTIVE' ? 'status-label-active' : 'status-label-inactive'}`}>{org.status}</span></td><td><button type="button" className="table-action-button" onClick={() => { setSelectedOrgId(org._id); setOrganizationDetails(org); }}>View details</button></td></tr>)}
          </tbody></table></div>
        )}
      </section>

      <div className="management-grid super-admin-provisioning-grid">
        <section className="management-card">
          <div className="management-card-heading"><div><p className="eyebrow">STEP 1</p><h2>Create organization</h2></div></div>
          <p className="section-description">Set the basic company identity and contact details.</p>
          <form onSubmit={createOrganization} className="management-form super-admin-form">
            <div className="form-field-group">
              <h3>Company information</h3>
              <div className="form-grid">
                <label className="field-control"><span>Organization name</span><input value={orgForm.name} required onChange={e => setOrgForm(prev => ({ ...prev, name: e.target.value }))} /></label>
                <label className="field-control"><span>Slug <em>(optional)</em></span><input value={orgForm.slug} onChange={e => setOrgForm(prev => ({ ...prev, slug: e.target.value }))} placeholder="e.g. acme-salon" /></label>
              </div>
            </div>
            <div className="form-field-group">
              <h3>Contact details</h3>
              <div className="form-grid">
                <label className="field-control"><span>Email</span><input type="email" value={orgForm.email} required onChange={e => setOrgForm(prev => ({ ...prev, email: e.target.value }))} /></label>
                <label className="field-control"><span>Phone</span><input value={orgForm.phone} required onChange={e => setOrgForm(prev => ({ ...prev, phone: e.target.value }))} /></label>
                <label className="field-control full-width"><span>Address</span><input value={orgForm.address} required onChange={e => setOrgForm(prev => ({ ...prev, address: e.target.value }))} /></label>
              </div>
            </div>
            <button type="submit" className="primary-button" disabled={creatingOrganization}>{creatingOrganization ? 'Creating…' : 'Create organization'}</button>
          </form>
        </section>

        <section className="management-card">
          <div className="management-card-heading">
            <div><p className="eyebrow">STEP 2</p><h2>Branches ({selectedOrg ? branches.length : 0})</h2></div>
            {selectedOrg ? <button type="button" className="secondary-button" onClick={() => void loadOrgData(selectedOrgId)} disabled={loadingOrgData}>{loadingOrgData ? 'Refreshing…' : 'Refresh'}</button> : null}
          </div>
          {!selectedOrg ? (
            <p className="empty-state">Select an organization above before adding branches.</p>
          ) : (
            <>
              <p className="section-description">Add the physical locations that belong to the selected organization.</p>
              <form onSubmit={createBranch} className="management-form super-admin-form">
                <div className="form-grid">
                  <label className="field-control"><span>Branch name</span><input value={branchForm.name} onChange={e => setBranchForm(prev => ({ ...prev, name: e.target.value }))} required /></label>
                  <label className="field-control"><span>Contact number</span><input value={branchForm.contactNumber} onChange={e => setBranchForm(prev => ({ ...prev, contactNumber: e.target.value }))} required /></label>
                  <label className="field-control full-width"><span>Address</span><input value={branchForm.address} onChange={e => setBranchForm(prev => ({ ...prev, address: e.target.value }))} required /></label>
                </div>
                <button type="submit" className="primary-button" disabled={creatingBranch}>{creatingBranch ? 'Adding…' : 'Add branch'}</button>
              </form>
              {branches.length ? <ul className="provisioning-list">{branches.map(branch => <li key={branch._id}><strong>{branch.name}</strong><span>{branch.address} · {branch.contactNumber}</span><small>{branch.status}</small></li>)}</ul> : <p className="empty-state compact-empty">No branches yet.</p>}
            </>
          )}
        </section>
      </div>

      {organizationDetails ? (
        <div className="super-admin-modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setOrganizationDetails(null); }}>
          <section className="super-admin-modal" role="dialog" aria-modal="true" aria-labelledby="organization-details-heading">
            <div className="management-card-heading"><div><p className="eyebrow">ORGANIZATION DETAILS</p><h2 id="organization-details-heading">{organizationDetails.name}</h2></div><button type="button" className="modal-close-button" onClick={() => setOrganizationDetails(null)} aria-label="Close organization details">×</button></div>
            <div className="organization-detail-grid">
              <div><span>Organization name</span><strong>{organizationDetails.name}</strong></div><div><span>Slug</span><strong>{organizationDetails.slug ? `/${organizationDetails.slug}` : '—'}</strong></div>
              <div><span>Email</span><strong>{organizationDetails.email}</strong></div><div><span>Phone</span><strong>{organizationDetails.phone}</strong></div>
              <div className="organization-detail-full"><span>Address</span><strong>{organizationDetails.address}</strong></div><div><span>Status</span><strong>{organizationDetails.status}</strong></div>
            </div>
            <div className="form-actions"><button type="button" className="primary-button" onClick={() => { setSelectedOrgId(organizationDetails._id); setOrganizationDetails(null); }}>Manage organization</button></div>
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
                </div><div className="organization-review"><p className="eyebrow">REVIEW</p><strong>{orgForm.name}</strong><span>{orgForm.slug ? `/${orgForm.slug}` : 'No slug'} · {orgForm.email || 'No email yet'}</span></div>
                <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setOrganizationStep(1)} disabled={creatingOrganization}>Back</button><button type="submit" className="primary-button" disabled={creatingOrganization}>{creatingOrganization ? 'Creating…' : 'Create organization'}</button></div></div>
              )}
            </form>
          </section>
        </div>
      ) : null}

      {selectedOrg ? (
        <>
          <section className="management-card super-admin-user-card">
            <div className="management-card-heading">
              <div><p className="eyebrow">STEP 3</p><h2>Create tenant user</h2></div>
            </div>
            <p className="section-description">Create the user's identity first, then configure role, preset, branch access, and module permissions.</p>

            <form onSubmit={createUser} className="management-form super-admin-form">
              <div className="form-field-group">
                <h3>User information</h3>
                <div className="form-grid">
                  <label className="field-control"><span>Full name</span><input value={userForm.name} onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))} required /></label>
                  <label className="field-control"><span>Email</span><input type="email" value={userForm.email} onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))} required /></label>
                  <label className="field-control full-width"><span>Temporary password</span>
                    <div className="super-admin-password-field">
                      <input className="super-admin-password-input" type={showTemporaryPassword ? 'text' : 'password'} minLength={8} value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} required />
                      <button type="button" className="super-admin-password-toggle" onClick={() => setShowTemporaryPassword(current => !current)} aria-label={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'} title={showTemporaryPassword ? 'Hide temporary password' : 'Show temporary password'}>
                        {showTemporaryPassword ? (
                          <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 5.2A10.6 10.6 0 0112 5c5.1 0 8.7 3.2 10 7-0.4 1.1-1 2.1-1.7 3M6.1 6.1C4.3 7.2 3.1 8.7 2 12c1.3 3.8 4.9 7 10 7 1.5 0 2.9-.3 4.1-.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M2 12s3.4-7 10-7 10 7 10 7-3.4 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8"/></svg>
                        )}
                      </button>
                    </div>
                    <small className="field-help">Use a temporary password and share it securely with the tenant user.</small>
                  </label>
                </div>
              </div>

              <div className="form-field-group">
                <h3>Role & permission preset</h3>
                <div className="form-grid">
                  <label className="field-control"><span>Role</span><select value={userForm.role} onChange={e => changeRole(e.target.value as TenantUser['role'])}>{['OWNER','MANAGER','CASHIER'].map(role => <option key={role}>{role}</option>)}</select></label>
                  <div className="field-control"><span>Permission preset</span>
                    <div className="preset-button-row" role="group" aria-label="Permission preset">
                      {(['OWNER', 'MANAGER', 'CASHIER'] as const).map(preset => (
                        <button key={preset} type="button" className={userForm.permissionPreset === preset ? 'preset-button preset-button-active' : 'preset-button'} aria-pressed={userForm.permissionPreset === preset} disabled={userForm.role === 'OWNER' && preset !== 'OWNER'} onClick={() => applyPreset(preset)}>{preset}</button>
                      ))}
                    </div>
                    <small className="field-help">{permissionsMatchPreset ? `${userForm.permissionPreset} preset applied. Modules are populated automatically.` : 'Manual module override active. Your custom module selection will be preserved.'}</small>
                  </div>
                </div>
              </div>

              <div className="form-field-group">
                <h3>Access control</h3>
                <div className="access-control-grid">
                  <fieldset className="management-fieldset">
                    <legend>Branch access</legend>
                    {userForm.role !== 'OWNER' ? (
                      branches.length ? <div className="branch-access-list">{branches.map(branch => (
                        <label key={branch._id} className="check-option"><input type="checkbox" checked={userForm.branchAccess.includes(branch._id)} onChange={e => setUserForm(prev => ({ ...prev, branchAccess: e.target.checked ? [...prev.branchAccess, branch._id] : prev.branchAccess.filter(id => id !== branch._id) }))} />{branch.name}</label>
                      ))}</div> : <p className="field-help">Add a branch before assigning branch access.</p>
                    ) : <p className="owner-access-note">OWNER receives <strong>ALL</strong> branch access automatically.</p>}
                  </fieldset>

                  <fieldset className="management-fieldset">
                    <legend>Module permissions</legend>
                    <p className="field-help">Preset fills these automatically, but manual assignment remains available.</p>
                    <div className="module-permission-grid">{MODULES.map(module => (
                      <label key={module} className="check-option">
                        <input type="checkbox" checked={userForm.modulePermissions.includes(module)} onChange={e => setUserForm(prev => ({ ...prev, modulePermissions: e.target.checked ? [...prev.modulePermissions, module] : prev.modulePermissions.filter(item => item !== module) }))} />
                        {module}
                      </label>
                    ))}</div>
                  </fieldset>
                </div>
              </div>

              <div className="form-actions"><button type="submit" className="primary-button" disabled={creatingUser}>{creatingUser ? 'Creating…' : 'Create tenant user'}</button></div>
            </form>
          </section>

          <section className="management-card">
            <div className="management-card-heading"><div><p className="eyebrow">TENANT USERS</p><h2>Users ({users.length})</h2></div></div>
            {loadingOrgData ? <p className="empty-state">Loading organization data…</p> : users.length === 0 ? <p className="empty-state">No tenant users yet. Create the first OWNER or operational user above.</p> : <div className="user-table-scroll"><table className="user-table"><thead><tr><th>User</th><th>Role</th><th>Preset</th><th>Branch access</th><th>Modules</th><th>Status</th></tr></thead><tbody>{users.map(user => <tr key={user._id}><td><strong>{user.name}</strong><span className="table-secondary">{user.email}</span></td><td>{user.role}</td><td>{user.permissionPreset ?? user.role}</td><td>{user.branchAccess === 'ALL' ? 'ALL branches' : `${user.branchAccess.length} branch${user.branchAccess.length === 1 ? '' : 'es'}`}</td><td>{user.modulePermissions.length} / {MODULES.length}</td><td><span className={`status-label ${user.status === 'ACTIVE' ? 'status-label-active' : 'status-label-inactive'}`}>{user.status}</span></td></tr>)}</tbody></table></div>}
          </section>
        </>
      ) : null}
    </section>
  );
}
