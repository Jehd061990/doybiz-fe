interface ErrorLike { message?: unknown; status?: unknown; statusCode?: unknown; payload?: unknown; }

const statusOf = (e: ErrorLike) => typeof e.status === 'number' ? e.status : typeof e.statusCode === 'number' ? e.statusCode : 0;
const messageOf = (e: ErrorLike) => typeof e.message === 'string' ? e.message : typeof e.payload === 'object' && e.payload ? String((e.payload as Record<string, unknown>).message || '') : '';

export function getStaffErrorMessage(value: unknown, operation: 'load'|'create'|'update'|'delete'|'assignment' = 'load') {
  const e = typeof value === 'object' && value ? value as ErrorLike : {};
  const status = statusOf(e);
  const message = messageOf(e).toLowerCase();
  if (status === 401) return 'Your session has expired. Sign in again.';
  if (status === 403) return 'You do not have permission to perform this staff action.';
  if (status === 404) return 'The requested staff member, service, or branch could not be found.';
  if (message.includes('already assigned')) return 'This service is already assigned to the staff member.';
  if (message.includes('same branch')) return 'Staff and service must belong to the same branch.';
  if (message.includes('do not have access')) return 'You do not have access to the selected branch.';
  if (status === 400) return operation === 'assignment' ? 'Unable to update service assignments. Check the selected service and staff member.' : 'Check the staff details and try again.';
  if (operation === 'load') return 'Unable to load staff. Try again shortly.';
  if (operation === 'delete') return 'Unable to deactivate this staff member right now. Try again shortly.';
  if (operation === 'assignment') return 'Unable to update service assignments right now. Try again shortly.';
  return 'Unable to save this staff member right now. Try again shortly.';
}
