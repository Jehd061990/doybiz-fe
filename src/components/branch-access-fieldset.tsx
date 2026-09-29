import type { UserRole } from '@/config/roles';
import type { OrganizationBranch } from '@/types/user-management';

interface BranchAccessFieldsetProps {
  role: UserRole;
  branches: OrganizationBranch[];
  selectedBranchIds: string[];
  onChange: (branchId: string, selected: boolean) => void;
}

export function BranchAccessFieldset({ role, branches, selectedBranchIds, onChange }: BranchAccessFieldsetProps) {
  return (
    <fieldset className="management-fieldset">
      <legend>Branch access</legend>
      <p className="field-help">Branch access is managed separately from role and module permissions.</p>
      {role === 'OWNER' ? (
        <p className="owner-access-note">Owners have organization-wide branch access.</p>
      ) : branches.length ? (
        <div className="branch-access-list">
          {branches.map(branch => (
            <label className="check-option" key={branch.id}>
              <input
                type="checkbox"
                checked={selectedBranchIds.includes(branch.id)}
                onChange={event => onChange(branch.id, event.currentTarget.checked)}
              />
              <span>{branch.name}</span>
              {branch.status === 'INACTIVE' ? <span className="branch-inactive-label">Inactive</span> : null}
            </label>
          ))}
        </div>
      ) : (
        <p className="owner-access-note">No organization branches are available.</p>
      )}
    </fieldset>
  );
}