'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import type { ModuleName } from '@/config/modules';
import { ROLES, type UserRole } from '@/config/roles';
import { getPresetPreview } from '@/config/role-presets';
import type { AccountStatus, PermissionPreset } from '@/types/auth';
import type {
  CreateOrganizationUserValues,
  OrganizationBranch,
  OrganizationUser,
  UpdateOrganizationUserValues,
} from '@/types/user-management';
import { BranchAccessFieldset } from './branch-access-fieldset';
import { ModulePermissionFieldset } from './module-permission-fieldset';

interface UserFormProps {
  mode: 'create' | 'edit';
  branches: OrganizationBranch[];
  organizationId: string;
  initialUser?: OrganizationUser;
  isSaving: boolean;
  error: string | null;
  onSubmit: (values: CreateOrganizationUserValues | UpdateOrganizationUserValues) => Promise<boolean | void>;
}

export function UserForm({
  mode,
  branches,
  organizationId,
  initialUser,
  isSaving,
  error,
  onSubmit,
}: UserFormProps) {
  const [role, setRole] = useState<UserRole>(initialUser?.role ?? 'CASHIER');
  const [permissionPreset, setPermissionPreset] = useState<PermissionPreset>(
    initialUser?.permissionPreset ?? initialUser?.role ?? 'CASHIER',
  );
  const [branchIds, setBranchIds] = useState<string[]>(
    Array.isArray(initialUser?.branchAccess) ? initialUser.branchAccess : [],
  );
  const [modulePermissions, setModulePermissions] = useState<ModuleName[]>(
    initialUser?.modulePermissions ?? getPresetPreview(role, permissionPreset),
  );
  const [status, setStatus] = useState<AccountStatus>(initialUser?.status ?? 'ACTIVE');
  const [usePresetDefaults, setUsePresetDefaults] = useState(mode === 'create');
  const [applyPresetOnSave, setApplyPresetOnSave] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const presetModules = getPresetPreview(role, permissionPreset);
  const previewingPreset = mode === 'create' ? usePresetDefaults : applyPresetOnSave;
  const shownModulePermissions = previewingPreset ? presetModules : modulePermissions;
  const availablePresets: PermissionPreset[] = role === 'OWNER' ? ['OWNER'] : ['MANAGER', 'CASHIER'];

  function changeRole(nextRole: UserRole) {
    setRole(nextRole);
    if (nextRole === 'OWNER') setPermissionPreset('OWNER');
    else if (permissionPreset === 'OWNER') setPermissionPreset(nextRole);
  }

  function changeModule(permission: ModuleName, enabled: boolean) {
    setModulePermissions(current => enabled
      ? [...current, permission]
      : current.filter(item => item !== permission));
  }

  function changeBranch(branchId: string, selected: boolean) {
    setBranchIds(current => selected
      ? current.includes(branchId) ? current : [...current, branchId]
      : current.filter(item => item !== branchId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const emailInput = form.elements.namedItem('email') as HTMLInputElement;

    if (!name || !email || !emailInput.checkValidity()) {
      setValidationError('Enter a name and a valid email address.');
      return;
    }
    if (mode === 'create' && password.length < 8) {
      setValidationError('Enter a password with at least 8 characters.');
      return;
    }

    if (mode === 'create') {
      const values: CreateOrganizationUserValues = {
        name,
        email,
        password,
        role,
        permissionPreset,
        branchAccess: role === 'OWNER' ? 'ALL' : branchIds,
        status,
        ...(!usePresetDefaults ? { modulePermissions } : {}),
      };
      const succeeded = await onSubmit(values);
      if (succeeded !== false) form.reset();
      return;
    }

    const values: UpdateOrganizationUserValues = {
      name,
      email,
      role,
      permissionPreset,
      branchAccess: role === 'OWNER' ? 'ALL' : branchIds,
      status,
      ...(applyPresetOnSave ? { applyPreset: true } : { modulePermissions }),
    };
    await onSubmit(values);
  }

  return (
    <form className="user-form" onSubmit={handleSubmit}>
      <section className="form-section" aria-labelledby="identity-heading">
        <h2 id="identity-heading">Identity</h2>
        <div className="form-grid">
          <label className="field-control">
            <span>Name</span>
            <input name="name" type="text" defaultValue={initialUser?.name} required />
          </label>
          <label className="field-control">
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" defaultValue={initialUser?.email} required />
          </label>
          {mode === 'create' ? (
            <label className="field-control">
              <span>Password</span>
              <input name="password" type="password" autoComplete="new-password" minLength={8} required />
              <span className="field-help">At least 8 characters. This password is sent only when creating the account.</span>
            </label>
          ) : null}
        </div>
      </section>

      {mode === 'edit' ? (
        <section className="form-section" aria-labelledby="organization-heading">
          <h2 id="organization-heading">Organization</h2>
          <p className="organization-context">Organization ID: <span>{organizationId}</span></p>
        </section>
      ) : null}

      <section className="form-section" aria-labelledby="role-heading">
        <h2 id="role-heading">Role</h2>
        <label className="field-control compact-field">
          <span>Organization role</span>
          <select name="role" value={role} onChange={event => changeRole(event.currentTarget.value as UserRole)}>
            {ROLES.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      </section>

      <section className="form-section" aria-labelledby="preset-heading">
        <h2 id="preset-heading">Role preset</h2>
        <label className="field-control compact-field">
          <span>Preset</span>
          <select
            name="permissionPreset"
            value={permissionPreset}
            onChange={event => setPermissionPreset(event.currentTarget.value as PermissionPreset)}
          >
            {availablePresets.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        {mode === 'create' ? (
          <div className="preset-action">
            <label className="check-option">
              <input
                type="checkbox"
                checked={usePresetDefaults}
                onChange={event => setUsePresetDefaults(event.currentTarget.checked)}
              />
              <span>Use backend preset defaults</span>
            </label>
            <p className="field-help">The checked modules preview current backend defaults. When selected, the module list is omitted so the backend applies the preset.</p>
          </div>
        ) : (
          <div className="preset-action">
            <label className="check-option">
              <input
                type="checkbox"
                checked={applyPresetOnSave}
                onChange={event => setApplyPresetOnSave(event.currentTarget.checked)}
              />
              <span>Apply this preset when saving</span>
            </label>
            <p className="field-help">
              {applyPresetOnSave
                ? 'Saving replaces this user’s current module permissions with the selected backend preset.'
                : 'Selecting a preset does not change this user’s current module permissions.'}
            </p>
          </div>
        )}
      </section>

      <section className="form-section" aria-labelledby="branch-heading">
        <h2 id="branch-heading">Branch access</h2>
        <BranchAccessFieldset
          role={role}
          branches={branches}
          selectedBranchIds={branchIds}
          onChange={changeBranch}
        />
      </section>

      <section className="form-section" aria-labelledby="modules-heading">
        <h2 id="modules-heading">Module permissions</h2>
        {previewingPreset ? <p className="field-help">Preset preview; saved permissions are returned by the backend.</p> : null}
        <ModulePermissionFieldset
          permissions={shownModulePermissions}
          disabled={previewingPreset}
          onChange={changeModule}
        />
        {mode === 'edit' && applyPresetOnSave ? (
          <p className="field-help">Uncheck “Apply this preset when saving” to edit the current effective permission list.</p>
        ) : null}
      </section>

      <section className="form-section" aria-labelledby="status-heading">
        <h2 id="status-heading">Account status</h2>
        <fieldset className="status-options">
          <legend>Status</legend>
          {(['ACTIVE', 'INACTIVE'] as const).map(option => (
            <label className="check-option" key={option}>
              <input
                type="radio"
                name="status"
                value={option}
                checked={status === option}
                onChange={() => setStatus(option)}
              />
              <span>{option === 'ACTIVE' ? 'Active' : 'Inactive'}</span>
            </label>
          ))}
        </fieldset>
      </section>

      {validationError || error ? <p className="management-error" role="alert">{validationError || error}</p> : null}
      <div className="form-actions">
        <Link className="secondary-button" href="/app/users">Cancel</Link>
        <button className="primary-button" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}