import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserForm } from './user-form';
import type { OrganizationBranch, OrganizationUser } from '@/types/user-management';

const branches: OrganizationBranch[] = [
  { id: 'branch-1', name: 'Main Branch', status: 'ACTIVE' },
  { id: 'branch-2', name: 'North Branch', status: 'INACTIVE' },
];

const ownerUser: OrganizationUser = {
  id: 'user-1',
  organizationId: 'org-1',
  name: 'Casey Owner',
  email: 'casey@example.com',
  role: 'MANAGER',
  branchAccess: ['branch-1'],
  modulePermissions: ['POS', 'CUSTOMERS'],
  permissionPreset: 'MANAGER',
  status: 'ACTIVE',
};

const fillCreateIdentity = () => {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Cashier' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'cashier@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'test-password-123' } });
};

describe('UserForm', () => {
  it('validates required identity fields before calling the backend', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    render(
      <UserForm
        mode="create"
        branches={branches}
        organizationId="org-1"
        isSaving={false}
        error={null}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.submit(screen.getByRole('button', { name: 'Create user' }).closest('form')!);

    expect(await screen.findByRole('alert')).toHaveTextContent('Enter a name and a valid email address.');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits role, preset, branch access, and backend-applied defaults separately', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    render(
      <UserForm
        mode="create"
        branches={branches}
        organizationId="org-1"
        isSaving={false}
        error={null}
        onSubmit={onSubmit}
      />,
    );
    fillCreateIdentity();
    fireEvent.change(screen.getByLabelText('Preset'), { target: { value: 'MANAGER' } });
    fireEvent.click(screen.getByLabelText(/North Branch/));

    expect(screen.getByLabelText('Reports')).toBeChecked();
    expect(screen.getByLabelText('Billing')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({
      name: 'New Cashier',
      email: 'cashier@example.com',
      password: 'test-password-123',
      role: 'CASHIER',
      permissionPreset: 'MANAGER',
      branchAccess: ['branch-2'],
      status: 'ACTIVE',
    }));
  });

  it('sends manual module permissions only after customization is selected', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    render(
      <UserForm
        mode="create"
        branches={branches}
        organizationId="org-1"
        isSaving={false}
        error={null}
        onSubmit={onSubmit}
      />,
    );
    fillCreateIdentity();
    fireEvent.click(screen.getByLabelText('Use backend preset defaults'));
    fireEvent.click(screen.getByLabelText('Billing'));
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      modulePermissions: ['POS', 'SALES', 'APPOINTMENTS', 'CUSTOMERS', 'BILLING'],
    })));
  });

  it('uses organization-wide branch access for an owner rather than normal branch assignment', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    render(
      <UserForm
        mode="create"
        branches={branches}
        organizationId="org-1"
        isSaving={false}
        error={null}
        onSubmit={onSubmit}
      />,
    );
    fillCreateIdentity();
    fireEvent.change(screen.getByLabelText('Organization role'), { target: { value: 'OWNER' } });

    expect(screen.getByText('Owners have organization-wide branch access.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Main Branch/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      role: 'OWNER',
      permissionPreset: 'OWNER',
      branchAccess: 'ALL',
    })));
  });

  it('preserves existing custom modules when changing a preset', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    render(
      <UserForm
        mode="edit"
        branches={branches}
        organizationId="org-1"
        initialUser={ownerUser}
        isSaving={false}
        error={null}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.change(screen.getByLabelText('Preset'), { target: { value: 'CASHIER' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      permissionPreset: 'CASHIER',
      modulePermissions: ['POS', 'CUSTOMERS'],
    })));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('applyPreset');
  });

  it('sends applyPreset explicitly and previews the backend preset without sending manual modules', async () => {
    const onSubmit = jest.fn().mockResolvedValue(true);
    render(
      <UserForm
        mode="edit"
        branches={branches}
        organizationId="org-1"
        initialUser={ownerUser}
        isSaving={false}
        error={null}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByLabelText('Apply this preset when saving'));

    expect(screen.getByLabelText('Reports')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      permissionPreset: 'MANAGER',
      applyPreset: true,
    })));
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('modulePermissions');
  });
});