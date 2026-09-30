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
    if (preset !== userForm.role) return;
    setUserForm(prev => ({ ...prev, permissionPreset: preset, modulePermissions: [...PRESETS[preset]] }));
  };

  const permissionsMatchPreset = userForm.modulePermissions.length === PRESETS[userForm.permissionPreset].length
    && PRESETS[userForm.permissionPreset].every(module => userForm.modulePermissions.includes(module));

  return (
    <section className="management-page" aria-labelledby="super-admin-heading">
      <header className="management-page-header">
        <div><p className="eyebrow">PLATFORM ADMINISTRATION</p><h1 id="super-admin-heading">Super Admin</h1><p className="management-description">Provision a tenant in a controlled flow: create the organization, add its branches, then create tenant users with role, branch, and module access.</p></div>
      </header>
      {message ? <p className="management-success" role="status">{message}</p> : null}
      <div className="super-admin-stats" aria-label="Platform overview">
        <div><span>Organizations</span><strong>{organizations.length}</strong></div>
        <div><span>Selected branches</span><strong>{selectedOrg ? branches.length : '—'}</strong></div>
        <div><span>Selected users</span><strong>{selectedOrg ? users.length : '—'}</strong></div>
      </div>

      <div className="management-grid">
        <section className="management-card">
          <div className="management-card-heading"><div><p className="eyebrow">STEP 1</p><h2>Create organization</h2></div></div>
          <form onSubmit={createOrganization} className="management-form">
            {(['name','slug','email','phone','address'] as const).map(field => (
              <label key={field}>{field === 'slug' ? 'Slug (optional)' : field[0].toUpperCase()+field.slice(1)}
                <input value={orgForm[field]} required={field !== 'slug'} onChange={e => setOrgForm(prev => ({ ...prev, [field]: e.target.value }))} />
              </label>
            ))}
            <button type="submit" disabled={creatingOrganization}>{creatingOrganization ? 'Creating…' : 'Create organization'}</button>
          </form>
        </section>

        <section className="management-card">
          <div className="management-card-heading"><div><p className="eyebrow">TENANT CONTEXT</p><h2>Organizations</h2></div><button type="button" className="secondary-button" onClick={() => void loadOrganizations()} disabled={loadingOrganizations}>{loadingOrganizations ? 'Refreshing…' : 'Refresh'}</button></div>
          <select aria-label="Select organization" value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)}>
            <option value="">Select an organization</option>
            {organizations.map(org => <option key={org._id} value={org._id}>{org.name} — {org.email}</option>)}
          </select>
          {selectedOrg ? <div className="selected-org-context"><strong>{selectedOrg.name}</strong><span>{selectedOrg.slug ? `/${selectedOrg.slug}` : 'No slug'} · {selectedOrg.status}</span><span>{selectedOrg.address} · {selectedOrg.phone}</span></div> : <p className="field-help">Select an organization to manage its branches and users. All provisioning below is scoped to the selected organization.</p>}
        </section>
      </div>

      {selectedOrg ? (
        <>
          <div className="management-grid">
            <section className="management-card">
              <div className="management-card-heading"><div><p className="eyebrow">STEP 2</p><h2>Branches ({branches.length})</h2></div><button type="button" className="secondary-button" onClick={() => void loadOrgData(selectedOrgId)} disabled={loadingOrgData}>{loadingOrgData ? 'Refreshing…' : 'Refresh'}</button></div>
              <form onSubmit={createBranch} className="management-form">
                <label>Name<input value={branchForm.name} onChange={e => setBranchForm(prev => ({ ...prev, name: e.target.value }))} required /></label>
                <label>Address<input value={branchForm.address} onChange={e => setBranchForm(prev => ({ ...prev, address: e.target.value }))} required /></label>
                <label>Contact number<input value={branchForm.contactNumber} onChange={e => setBranchForm(prev => ({ ...prev, contactNumber: e.target.value }))} required /></label>
                <button type="submit" disabled={creatingBranch}>{creatingBranch ? 'Adding…' : 'Add branch'}</button>
              </form>
              <ul>{branches.map(branch => <li key={branch._id}>{branch.name} — {branch.address} ({branch.status})</li>)}</ul>
            </section>

            <section className="management-card">
              <div className="management-card-heading"><div><p className="eyebrow">STEP 3</p><h2>Create tenant user</h2></div></div>
              <form onSubmit={createUser} className="management-form">
                <label>Name<input value={userForm.name} onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))} required /></label>
                <label>Email<input type="email" value={userForm.email} onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))} required /></label>
                <label>Temporary password<input type="password" minLength={8} value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} required /></label>
                <label>Role<select value={userForm.role} onChange={e => changeRole(e.target.value as TenantUser['role'])}>{['OWNER','MANAGER','CASHIER'].map(role => <option key={role}>{role}</option>)}</select></label>
                <fieldset>
                  <legend>Role permission preset</legend>
                  <p>Selecting a preset automatically checks its recommended modules. You can still manually change the module checkboxes below.</p>
                  <div role="group" aria-label="Permission preset">
                    {(['OWNER', 'MANAGER', 'CASHIER'] as const).map(preset => (
                      <button
                        key={preset}
                        type="button"
                        aria-pressed={userForm.permissionPreset === preset}
                        disabled={preset !== userForm.role}
                        onClick={() => applyPreset(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <p role="status">
                    {permissionsMatchPreset ? `${userForm.permissionPreset} preset applied.` : 'Manual module override active.'}
                  </p>
                </fieldset>
                {userForm.role !== 'OWNER' ? <fieldset><legend>Branch access</legend>{branches.map(branch => (
                  <label key={branch._id}><input type="checkbox" checked={userForm.branchAccess.includes(branch._id)} onChange={e => setUserForm(prev => ({ ...prev, branchAccess: e.target.checked ? [...prev.branchAccess, branch._id] : prev.branchAccess.filter(id => id !== branch._id) }))} /> {branch.name}</label>
                ))}</fieldset> : <p>OWNER receives ALL branch access.</p>}
                <fieldset>
                  <legend>Module permissions</legend>
                  <p>Manual assignment remains available even after applying a role preset.</p>
                  {MODULES.map(module => (
                    <label key={module}>
                      <input
                        type="checkbox"
                        checked={userForm.modulePermissions.includes(module)}
                        onChange={e => setUserForm(prev => ({
                          ...prev,
                          modulePermissions: e.target.checked
                            ? [...prev.modulePermissions, module]
                            : prev.modulePermissions.filter(item => item !== module),
                        }))}
                      /> {module}
                    </label>
                  ))}
                </fieldset>
                <button type="submit" disabled={creatingUser}>{creatingUser ? 'Creating…' : 'Create user'}</button>
              </form>
            </section>
          </div>
          <section className="management-card">
            <div className="management-card-heading"><div><p className="eyebrow">TENANT USERS</p><h2>Users ({users.length})</h2></div></div>
            {loadingOrgData ? <p className="empty-state">Loading organization data…</p> : users.length === 0 ? <p className="empty-state">No tenant users yet. Create the first OWNER or operational user above.</p> : <div className="user-table-scroll"><table className="user-table"><thead><tr><th>User</th><th>Role</th><th>Preset</th><th>Branch access</th><th>Modules</th><th>Status</th></tr></thead><tbody>{users.map(user => <tr key={user._id}><td><strong>{user.name}</strong><span className="table-secondary">{user.email}</span></td><td>{user.role}</td><td>{user.permissionPreset ?? user.role}</td><td>{user.branchAccess === 'ALL' ? 'ALL branches' : `${user.branchAccess.length} branch${user.branchAccess.length === 1 ? '' : 'es'}`}</td><td>{user.modulePermissions.length} / {MODULES.length}</td><td><span className={`status-label ${user.status === 'ACTIVE' ? 'status-label-active' : 'status-label-inactive'}`}>{user.status}</span></td></tr>)}</tbody></table></div>}
          </section>
        </>
      ) : null}
    </section>
  );
}
