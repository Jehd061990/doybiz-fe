'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCustom, useCustomMutation, type HttpError } from '@refinedev/core';
import { useState, type FormEvent } from 'react';
import { useBranches } from '@/lib/branches/use-branches';
import { useAuthSession } from '@/lib/auth/use-auth-session';
import { getStaffErrorMessage } from '@/lib/staff/errors';
import type { Staff, StaffFormValues, StaffListResponse, StaffService, StaffServiceListResponse, StaffStatus } from '@/types/staff';

const idOf = (v: { id?: string; _id?: string }) => v.id || v._id || '';
const branchName = (value: Staff['branchId']) => typeof value === 'object' && value ? value.name || 'Assigned branch' : 'Assigned branch';

function StaffForm({ initial, saving, error, onSubmit }: { initial?: Staff; saving: boolean; error: string | null; onSubmit: (v: StaffFormValues) => Promise<boolean> }) {
  const branches = useBranches();
  const [branchId, setBranchId] = useState(() => typeof initial?.branchId === 'object' ? idOf(initial.branchId) : initial?.branchId || '');
  const [firstName, setFirstName] = useState(initial?.firstName || '');
  const [lastName, setLastName] = useState(initial?.lastName || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [position, setPosition] = useState(initial?.position || '');
  const [status, setStatus] = useState<StaffStatus>(initial?.status || 'ACTIVE');

  if (branches.query.isLoading) return <p className="management-state" role="status">Loading branches…</p>;
  if (branches.query.isError) return <p className="management-error" role="alert">Unable to load organization branches.</p>;
  const activeBranches = branches.result.data.filter(b => b.status === 'ACTIVE');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await onSubmit({ branchId, firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), ...(email.trim() ? { email: email.trim() } : {}), position: position.trim(), status });
  }

  return <form className="management-form" onSubmit={submit}>
    <div className="form-grid">
      <label className="field-control"><span>Branch *</span><select required value={branchId} onChange={e => setBranchId(e.currentTarget.value)}><option value="">Select branch</option>{activeBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label className="field-control"><span>First name *</span><input required value={firstName} onChange={e => setFirstName(e.currentTarget.value)} /></label>
      <label className="field-control"><span>Last name *</span><input required value={lastName} onChange={e => setLastName(e.currentTarget.value)} /></label>
      <label className="field-control"><span>Phone *</span><input required value={phone} onChange={e => setPhone(e.currentTarget.value)} /></label>
      <label className="field-control"><span>Email</span><input type="email" value={email} onChange={e => setEmail(e.currentTarget.value)} /></label>
      <label className="field-control"><span>Position *</span><input required value={position} onChange={e => setPosition(e.currentTarget.value)} placeholder="e.g. Stylist" /></label>
      <label className="field-control"><span>Status</span><select value={status} onChange={e => setStatus(e.currentTarget.value as StaffStatus)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
    </div>
    {error ? <p className="management-error" role="alert">{error}</p> : null}
    <div className="form-actions"><Link className="secondary-button" href="/app/staff">Cancel</Link><button className="primary-button" type="submit" disabled={saving}>{saving ? 'Saving…' : initial ? 'Save changes' : 'Create staff'}</button></div>
  </form>;
}

function StaffListContent() {
  const branches = useBranches();
  const { session } = useAuthSession();
  const [branchId, setBranchId] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<'' | StaffStatus>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams();
  if (branchId) params.set('branchId', branchId);
  if (position.trim()) params.set('position', position.trim());
  if (status) params.set('status', status);
  if (search.trim()) params.set('search', search.trim());
  params.set('page', String(page)); params.set('limit', '25');
  const query = useCustom<StaffListResponse>({ url: `/staff?${params.toString()}`, method: 'get' });
  const canManage = session.user?.role === 'OWNER' || session.user?.role === 'MANAGER';

  if (branches.query.isLoading) return <p className="management-state" role="status">Loading branches…</p>;
  if (branches.query.isError) return <p className="management-error" role="alert">Unable to load branches.</p>;
  const staff = query.result.data?.data || [];
  const pagination = query.result.data?.pagination;
  const activeBranches = branches.result.data.filter(b => b.status === 'ACTIVE');

  return <section className="management-page" aria-labelledby="staff-heading">
    <header className="management-page-header"><div><p className="eyebrow">STAFF</p><h1 id="staff-heading">Staff</h1><p className="management-description">Manage staff members and the services they can perform.</p></div>{canManage ? <Link className="primary-action-link" href="/app/staff/create">Create staff</Link> : null}</header>
    <div className="user-list-toolbar">
      <label className="field-control search-control"><span>Search</span><input type="search" placeholder="Name, phone, email or position" value={search} onChange={e => {setSearch(e.currentTarget.value);setPage(1)}} /></label>
      <label className="field-control"><span>Branch</span><select value={branchId} onChange={e => {setBranchId(e.currentTarget.value);setPage(1)}}><option value="">All accessible branches</option>{activeBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      <label className="field-control"><span>Position</span><input value={position} onChange={e => {setPosition(e.currentTarget.value);setPage(1)}} placeholder="e.g. Stylist" /></label>
      <label className="field-control"><span>Status</span><select value={status} onChange={e => {setStatus(e.currentTarget.value as ''|StaffStatus);setPage(1)}}><option value="">All statuses</option><option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option></select></label>
    </div>
    {query.query.isLoading ? <p className="management-state" role="status">Loading staff…</p> : null}
    {query.query.isError ? <p className="management-error" role="alert">{getStaffErrorMessage(query.query.error)}</p> : null}
    {!query.query.isLoading && !query.query.isError && staff.length === 0 ? <p className="billing-empty-note">No staff found.</p> : null}
    {staff.length ? <div className="user-table-scroll"><table className="user-table"><thead><tr><th>Name</th><th>Branch</th><th>Position</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead><tbody>{staff.map(member => { const id=idOf(member); return <tr key={id}><td><strong>{member.firstName} {member.lastName}</strong><span className="table-secondary">{member.email || '—'}</span></td><td>{branchName(member.branchId)}</td><td>{member.position}</td><td>{member.phone}</td><td><span className={`status-label status-label-${member.status.toLowerCase()}`}>{member.status}</span></td><td><Link className="table-action" href={`/app/staff/${encodeURIComponent(id)}`}>{canManage ? 'View / edit' : 'View'}</Link></td></tr>; })}</tbody></table></div> : null}
    {pagination && pagination.totalPages > 1 ? <div className="pos-pagination"><button className="secondary-button" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Page {pagination.page} of {pagination.totalPages}</span><button className="secondary-button" disabled={page>=pagination.totalPages} onClick={()=>setPage(p=>p+1)}>Next</button></div> : null}
  </section>;
}

function StaffEditContent() {
  const router = useRouter(); const params = useParams<{id:string}>(); const staffId=params.id;
  const query=useCustom<{success:boolean;staff:Staff}>({url:`/staff/${encodeURIComponent(staffId)}`,method:'get'});
  const {session}=useAuthSession(); const canManage=session.user?.role==='OWNER'||session.user?.role==='MANAGER';
  const updateMutation=useCustomMutation<{success:boolean;staff:Staff},HttpError,StaffFormValues>({mutationOptions:{gcTime:0}});
  const deleteMutation=useCustomMutation<{success:boolean;staff:Staff},HttpError,Record<string,never>>({mutationOptions:{gcTime:0}});
  const assignmentMutation=useCustomMutation({mutationOptions:{gcTime:0}});
  const servicesQuery=useCustom<StaffServiceListResponse>({url:`/staff/${encodeURIComponent(staffId)}/services`,method:'get'});
  const services=servicesQuery.result.data?.services || [];
  const [error,setError]=useState<string|null>(null);
  const [assignmentError,setAssignmentError]=useState<string|null>(null);
  const [serviceId,setServiceId]=useState('');
  const availableServices=useCustom<{success:boolean;data:StaffService[]}>({url:'/services?status=ACTIVE&limit=100',method:'get'});
  if(query.query.isLoading) return <p className="management-state" role="status">Loading staff…</p>;
  if(query.query.isError||!query.result.data?.staff) return <p className="management-error" role="alert">{getStaffErrorMessage(query.query.error)}</p>;
  const staff=query.result.data.staff;
  const canAssign=canManage;
  async function save(values:StaffFormValues){setError(null);try{await updateMutation.mutateAsync({url:`/staff/${encodeURIComponent(staffId)}`,method:'put',values});router.replace('/app/staff');return true}catch(e){setError(getStaffErrorMessage(e,'update'));return false}}
  async function deactivate(){if(staff.status==='INACTIVE'||!window.confirm('Deactivate this staff member?'))return;setError(null);try{await deleteMutation.mutateAsync({url:`/staff/${encodeURIComponent(staffId)}`,method:'delete',values:{}});router.replace('/app/staff')}catch(e){setError(getStaffErrorMessage(e,'delete'))}}
  async function assignService(){if(!serviceId)return;setAssignmentError(null);try{await assignmentMutation.mutateAsync({url:`/staff/${encodeURIComponent(staffId)}/services/${encodeURIComponent(serviceId)}`,method:'post',values:{}});setServiceId('');await servicesQuery.query.refetch();}catch(e){setAssignmentError(getStaffErrorMessage(e,'assignment'))}}
  return <section className="management-page" aria-labelledby="staff-detail-heading"><header className="management-page-header"><div><p className="eyebrow">STAFF</p><h1 id="staff-detail-heading">{staff.firstName} {staff.lastName}</h1><p className="management-description">{staff.position} · {branchName(staff.branchId)}</p></div><Link className="secondary-button" href="/app/staff">Back</Link></header>
    <StaffForm initial={staff} saving={updateMutation.mutation.isPending||deleteMutation.mutation.isPending} error={error} onSubmit={save}/>
    <section className="management-panel"><h2>Assigned services</h2><p className="management-description">Services this staff member is qualified to perform.</p>
      {servicesQuery.query.isLoading?<p className="management-state">Loading assigned services…</p>:null}
      {servicesQuery.query.isError?<p className="management-error">{getStaffErrorMessage(servicesQuery.query.error,'assignment')}</p>:null}
      <ul>{services.map(service=><li key={idOf(service)}>{service.name} — ₱{service.price}</li>)}</ul>
      {canAssign?<div className="form-actions"><select value={serviceId} onChange={e=>setServiceId(e.currentTarget.value)}><option value="">Select active service</option>{(availableServices.result.data?.data||[]).filter(s=>!services.some(a=>idOf(a)===idOf(s))).map(s=><option key={idOf(s)} value={idOf(s)}>{s.name}</option>)}</select><button className="primary-button" disabled={!serviceId||assignmentMutation.mutation.isPending} onClick={assignService}>{assignmentMutation.mutation.isPending?'Assigning…':'Assign service'}</button></div>:null}
      {assignmentError?<p className="management-error">{assignmentError}</p>:null}
    </section>
  </section>;
}
export function StaffListPage(){return <StaffListContent/>}
export function StaffCreatePage(){const router=useRouter();const createMutation=useCustomMutation<{success:boolean;staff:Staff},HttpError,StaffFormValues>({mutationOptions:{gcTime:0}});const [error,setError]=useState<string|null>(null);async function save(v:StaffFormValues){setError(null);try{await createMutation.mutateAsync({url:'/staff',method:'post',values:v});router.replace('/app/staff');return true}catch(e){setError(getStaffErrorMessage(e,'create'));return false}}return <section className="management-page"><header className="management-page-header"><div><p className="eyebrow">STAFF</p><h1>Create staff</h1></div></header><StaffForm saving={createMutation.mutation.isPending} error={error} onSubmit={save}/></section>}
export function StaffEditPage(){return <StaffEditContent/>}
