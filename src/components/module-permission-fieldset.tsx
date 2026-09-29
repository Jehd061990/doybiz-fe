import { MODULE_REGISTRY, type ModuleName } from '@/config/modules';

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
        {MODULE_REGISTRY.map(({ key, label }) => (
          <label className="check-option" key={key}>
            <input
              type="checkbox"
              checked={permissions.includes(key)}
              onChange={event => onChange(key, event.currentTarget.checked)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}