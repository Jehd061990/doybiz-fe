interface BillingErrorLike {
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  payload?: unknown;
}

function billingErrorDetails(value: unknown) {
  const error = typeof value === 'object' && value !== null ? value as BillingErrorLike : {};
  const status = typeof error.status === 'number'
    ? error.status
    : typeof error.statusCode === 'number'
      ? error.statusCode
      : 0;
  const payloadMessage = typeof error.payload === 'object' && error.payload !== null
    ? (error.payload as Record<string, unknown>).message
    : undefined;
  const message = typeof error.message === 'string'
    ? error.message.toLowerCase()
    : typeof payloadMessage === 'string'
      ? payloadMessage.toLowerCase()
      : '';
  return { status, message };
}

export function getBillingErrorMessage(
  value: unknown,
  action: 'load' | 'activate' | 'generate' | 'adjust' | 'payment' = 'load',
) {
  const { status, message } = billingErrorDetails(value);

  if (status === 401) return 'Your session has expired. Sign in again.';
  if (status === 403) return 'Billing access is not available for your account.';
  if (status === 404) return 'This billing record could not be found in your organization.';
  if (message.includes('no additional billing is required')) {
    return 'The selected additions do not require a billable adjustment.';
  }
  if (message.includes('active prepaid subscription is required')) {
    return 'A prepaid active subscription is required for this adjustment.';
  }
  if (message.includes('this billing record cannot accept payment')) {
    return 'This billing record is no longer available for payment.';
  }
  if (status === 400) {
    if (action === 'activate') return 'A prepaid subscription could not be started. Review the existing subscription and try again.';
    if (action === 'adjust') return 'The selected additions could not be added to a billing adjustment. Review them and try again.';
    if (action === 'payment') return 'A payment request could not be created. Try again or refresh the billing record.';
    if (action === 'generate') return 'An invoice could not be generated for the current subscription.';
    return 'The billing request could not be completed. Review the information and try again.';
  }
  if (action === 'load') return 'Unable to load billing information. Try again shortly.';
  if (action === 'activate') return 'Unable to start a prepaid subscription right now. Try again shortly.';
  if (action === 'adjust') return 'Unable to create a billing adjustment right now. Try again shortly.';
  if (action === 'payment') return 'Unable to start payment right now. Try again shortly.';
  if (action === 'generate') return 'Unable to generate an invoice right now. Try again shortly.';
  return 'Unable to complete this billing action right now. Try again shortly.';
}