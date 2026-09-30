interface ErrorLike {
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  payload?: unknown;
}

const getStatus = (error: ErrorLike) =>
  typeof error.status === 'number' ? error.status :
  typeof error.statusCode === 'number' ? error.statusCode : 0;

const getMessage = (error: ErrorLike) => {
  if (typeof error.message === 'string') return error.message;
  if (typeof error.payload === 'object' && error.payload !== null) {
    const message = (error.payload as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return '';
};

export function getCustomerErrorMessage(
  value: unknown,
  operation: 'load' | 'create' | 'update' | 'delete' = 'load',
) {
  const error = typeof value === 'object' && value !== null ? value as ErrorLike : {};
  const status = getStatus(error);
  const message = getMessage(error).toLowerCase();

  if (status === 401) return 'Your session has expired. Sign in again.';
  if (status === 403) return 'You do not have permission to manage customers.';
  if (status === 404) return 'This customer could not be found in your organization.';
  if (status === 400) {
    if (message.includes('first name') || message.includes('last name') || message.includes('phone')) {
      return 'First name, last name, and phone are required.';
    }
    return operation === 'create'
      ? 'Check the customer details and try again.'
      : 'Check the customer changes and try again.';
  }
  if (operation === 'load') return 'Unable to load customers. Try again shortly.';
  if (operation === 'delete') return 'Unable to deactivate this customer right now. Try again shortly.';
  return 'Unable to save this customer right now. Try again shortly.';
}
