import { MODULES, type ModuleName } from '@/config/modules';

const moduleLabels: Record<ModuleName, string> = {
  POS: 'Point of sale',
  SALES: 'Sales',
  APPOINTMENTS: 'Appointments',
  CUSTOMERS: 'Customers',
  REPORTS: 'Reports',
  STAFF: 'Staff',
  BILLING: 'Billing',
};

interface ModulePermissionFieldsetProps {
  permissions: ModuleName[];
  disabled?: boolean;
  onChange: (permission: ModuleName, enabled: boolean) => void;
}

export function ModulePermissionFieldset({ permissions, disabled = false, onChange }: ModulePermissionFieldsetProps) {
  return (
    <fieldset className="management-fieldset" disabled={disabled}>
      <legend>Module permissions</legend>
      <p className="field-help">These permissions are separate from role and branch access.</p>
      <div className="module-permission-grid">
        {MODULES.map(module => (
          <label className="check-option" key={module}>
            <input
              type="checkbox"
              checked={permissions.includes(module)}
              onChange={event => onChange(module, event.currentTarget.checked)}
            />
            <span>{moduleLabels[module]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}