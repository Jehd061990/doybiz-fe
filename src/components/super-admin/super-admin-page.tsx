'use client';

import { useEffect, useMemo, useState } from 'react';
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
  const [orgForm, setOrgForm] = useState({ name: '', slug: '', email: '', phone: '', address: '' });
  const [branchForm, setBranchForm] = useState({ name: '', address: '', contactNumber: '' });
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: 'CASHIER' as 'OWNER' | 'MANAGER' | 'CASHIER',
    permissionPreset: 'CASHIER' as 'OWNER' | 'MANAGER' | 'CASHIER', branchAccess: [] as string[], modulePermissions: PRESETS.CASHIER,
  });

  const selectedOrg = useMemo(() => organizations.find(org => org._id === selectedOrgId), [organizations, selectedOrgId]);

  const loadOrganizations = async () => {
    const response = await apiRequest<OrganizationsResponse>('/api/backend/platform/organizations');
    setOrganizations(response.organizations);
  };

  const loadOrgData = async (organizationId: string) => {
    const [branchResponse, userResponse] = await Promise.all([
      apiRequest<BranchesResponse>(`/api/backend/platform/organizations/${organizationId}/branches`),
      apiRequest<UsersResponse>(`/api/backend/platform/organizations/${organizationId}/users`),
    ]);
    setBranches(branchResponse.branches);
    setUsers(userResponse.users);
  };

  useEffect(() => { void loadOrganizations().catch(error => setMessage(error instanceof Error ? error.message : 'Failed to load organizations.')); }, []);
  useEffect(() => {
    if (!selectedOrgId) { setBranches([]); setUsers([]); return; }
    void loadOrgData(selectedOrgId).catch(error => setMessage(error instanceof Error ? error.message : 'Failed to load organization data.'));
  }, [selectedOrgId]);

  const createOrganization = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage('');
    try {
      await apiRequest('/api/backend/platform/organizations', { method: 'POST', body: orgForm });
      setOrgForm({ name: '', slug: '', email: '', phone: '', address: '' });
      await loadOrganizations(); setMessage('Organization created.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Failed to create organization.'); }
  };

  const createBranch = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedOrgId) return; setMessage('');
    try {
      await apiRequest(`/api/backend/platform/organizations/${selectedOrgId}/branches`, { method: 'POST', body: branchForm });
      setBranchForm({ name: '', address: '', contactNumber: '' }); await loadOrgData(selectedOrgId); setMessage('Branch created.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Failed to create branch.'); }
  };

  const createUser = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedOrgId) return; setMessage('');
    const branchAccess = userForm.role === 'OWNER' ? 'ALL' : userForm.branchAccess;
    try {
      await apiRequest(`/api/backend/platform/organizations/${selectedOrgId}/users`, {
        method: 'POST',
        body: { ...userForm, branchAccess, modulePermissions: userForm.modulePermissions },
      });
      setUserForm({ name: '', email: '', password: '', role: 'CASHIER', permissionPreset: 'CASHIER', branchAccess: [], modulePermissions: PRESETS.CASHIER });
      await loadOrgData(selectedOrgId); setMessage('User created.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Failed to create user.'); }
  };

  const changeRole = (role: 'OWNER' | 'MANAGER' | 'CASHIER') => {
    setUserForm(prev => ({ ...prev, role, permissionPreset: role, modulePermissions: [...PRESETS[role]], branchAccess: role === 'OWNER' ? [] : prev.branchAccess }));
  };

  return (
    <section className="management-page" aria-labelledby="super-admin-heading">
      <header className="management-page-header">
        <div><p className="eyebrow">PLATFORM ADMINISTRATION</p><h1 id="super-admin-heading">Super Admin</h1><p>Manually provision organizations, branches, and tenant users.</p></div>
      </header>
      {message ? <p role="status">{message}</p> : null}

      <div className="management-grid">
        <section className="management-card">
          <h2>Create organization</h2>
          <form onSubmit={createOrganization} className="management-form">
            {(['name','slug','email','phone','address'] as const).map(field => (
              <label key={field}>{field === 'slug' ? 'Slug (optional)' : field[0].toUpperCase()+field.slice(1)}
                <input value={orgForm[field]} required={field !== 'slug'} onChange={e => setOrgForm(prev => ({ ...prev, [field]: e.target.value }))} />
              </label>
            ))}
            <button type="submit">Create organization</button>
          </form>
        </section>

        <section className="management-card">
          <h2>Organizations</h2>
          <select aria-label="Select organization" value={selectedOrgId} onChange={e => setSelectedOrgId(e.target.value)}>
            <option value="">Select an organization</option>
            {organizations.map(org => <option key={org._id} value={org._id}>{org.name} — {org.email}</option>)}
          </select>
          {selectedOrg ? <p>{selectedOrg.address} · {selectedOrg.phone} · {selectedOrg.status}</p> : <p>Select an organization to manage branches and users.</p>}
        </section>
      </div>

      {selectedOrg ? (
        <>
          <div className="management-grid">
            <section className="management-card">
              <h2>Branches ({branches.length})</h2>
              <form onSubmit={createBranch} className="management-form">
                <label>Name<input value={branchForm.name} onChange={e => setBranchForm(prev => ({ ...prev, name: e.target.value }))} required /></label>
                <label>Address<input value={branchForm.address} onChange={e => setBranchForm(prev => ({ ...prev, address: e.target.value }))} required /></label>
                <label>Contact number<input value={branchForm.contactNumber} onChange={e => setBranchForm(prev => ({ ...prev, contactNumber: e.target.value }))} required /></label>
                <button type="submit">Add branch</button>
              </form>
              <ul>{branches.map(branch => <li key={branch._id}>{branch.name} — {branch.address} ({branch.status})</li>)}</ul>
            </section>

            <section className="management-card">
              <h2>Create tenant user</h2>
              <form onSubmit={createUser} className="management-form">
                <label>Name<input value={userForm.name} onChange={e => setUserForm(prev => ({ ...prev, name: e.target.value }))} required /></label>
                <label>Email<input type="email" value={userForm.email} onChange={e => setUserForm(prev => ({ ...prev, email: e.target.value }))} required /></label>
                <label>Temporary password<input type="password" minLength={8} value={userForm.password} onChange={e => setUserForm(prev => ({ ...prev, password: e.target.value }))} required /></label>
                <label>Role<select value={userForm.role} onChange={e => changeRole(e.target.value as TenantUser['role'])}>{['OWNER','MANAGER','CASHIER'].map(role => <option key={role}>{role}</option>)}</select></label>
                <label>Permission preset<select value={userForm.permissionPreset} onChange={e => {
                  const preset = e.target.value as TenantUser['role'];
                  setUserForm(prev => ({ ...prev, permissionPreset: preset, modulePermissions: [...PRESETS[preset]] }));
                }}>{['OWNER','MANAGER','CASHIER'].map(preset => <option key={preset}>{preset}</option>)}</select></label>
                {userForm.role !== 'OWNER' ? <fieldset><legend>Branch access</legend>{branches.map(branch => (
                  <label key={branch._id}><input type="checkbox" checked={userForm.branchAccess.includes(branch._id)} onChange={e => setUserForm(prev => ({ ...prev, branchAccess: e.target.checked ? [...prev.branchAccess, branch._id] : prev.branchAccess.filter(id => id !== branch._id) }))} /> {branch.name}</label>
                ))}</fieldset> : <p>OWNER receives ALL branch access.</p>}
                <fieldset><legend>Module permissions</legend>{MODULES.map(module => (
                  <label key={module}><input type="checkbox" checked={userForm.modulePermissions.includes(module)} onChange={e => setUserForm(prev => ({ ...prev, modulePermissions: e.target.checked ? [...prev.modulePermissions, module] : prev.modulePermissions.filter(item => item !== module) }))} /> {module}</label>
                ))}</fieldset>
                <button type="submit">Create user</button>
              </form>
            </section>
          </div>
          <section className="management-card">
            <h2>Users ({users.length})</h2>
            <ul>{users.map(user => <li key={user._id}>{user.name} — {user.email} — {user.role} — {user.permissionPreset ?? user.role} — {user.status}</li>)}</ul>
          </section>
        </>
      ) : null}
    </section>
  );
}
