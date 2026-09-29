interface ErrorLike {
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  payload?: unknown;
}

const getStatus = (error: ErrorLike) =>
  typeof error.status === 'number'
    ? error.status
    : typeof error.statusCode === 'number'
      ? error.statusCode
      : 0;

const getMessage = (error: ErrorLike) => {
  if (typeof error.message === 'string') return error.message;
  if (typeof error.payload === 'object' && error.payload !== null) {
    const message = (error.payload as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return '';
};

export function getUserManagementErrorMessage(
  value: unknown,
  operation: 'load' | 'create' | 'update' = 'load',
  resource: 'users' | 'branches' = 'users',
) {
  const error = typeof value === 'object' && value !== null ? value as ErrorLike : {};
  const status = getStatus(error);
  const message = getMessage(error).toLowerCase();

  if (message.includes('must retain at least one active owner')) {
    return 'This user cannot be changed because the organization must retain an active owner.';
  }
  if (message.includes('assign organization branch ids before changing')) {
    return 'Assign organization branches before changing this owner to a non-owner role.';
  }
  if (status === 401) return 'Your session has expired. Sign in again.';
  if (status === 403) {
    return resource === 'branches'
      ? 'You do not have permission to create organization branches.'
      : 'Only an organization owner can manage users.';
  }
  if (status === 404) {
    return resource === 'branches'
      ? 'The branch could not be found in your organization.'
      : 'This user could not be found in your organization.';
  }
  if (status === 409) {
    return resource === 'branches'
      ? 'The branch could not be saved because it conflicts with existing organization data. Review the details and try again.'
      : 'A user with this email already exists in your organization.';
  }
  if (status === 400 && message.includes('password of at least 8 characters')) {
    return 'Enter a password with at least 8 characters.';
  }
  if (status === 400 && message.includes('one or more branches do not belong')) {
    return 'One or more selected branches are no longer available in your organization.';
  }
  if (status === 400 && message.includes('invalid permission preset')) {
    return 'Choose a role preset that is valid for this role.';
  }
  if (status === 400) {
    if (resource === 'branches') return 'Check the branch details and try again.';
    return operation === 'create'
      ? 'Check the user details and try again. The email may already be in use.'
      : 'Check the user changes and try again.';
  }
  if (operation === 'load') {
    return resource === 'branches'
      ? 'Unable to load organization branches. Try again shortly.'
      : 'Unable to load organization users. Try again shortly.';
  }
  return resource === 'branches'
    ? 'Unable to create this branch right now. Try again shortly.'
    : 'Unable to save this user right now. Try again shortly.';
}