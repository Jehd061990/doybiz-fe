interface PosErrorLike {
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  payload?: unknown;
}

export function getPosErrorMessage(value: unknown, context: 'catalog' | 'sale' | 'payment' | 'receipt' = 'sale') {
  const error = typeof value === 'object' && value !== null ? value as PosErrorLike : {};
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

  if (status === 401) return 'Your session has expired. Sign in again.';
  if (status === 403) return 'You do not have access to complete this POS action.';
  if (status === 404) {
    return context === 'catalog'
      ? 'The selected branch or service is no longer available.'
      : 'The requested sale could not be found in this organization.';
  }
  if (message.includes('branch not found or inactive') || message.includes('do not have access to this branch')) {
    return 'Choose an active branch available to your account.';
  }
  if (message.includes('service not found or inactive') || message.includes('service is not available at the selected branch')) {
    return 'One of the selected services is no longer available at this branch.';
  }
  if (message.includes('already fully paid')) return 'This sale is already fully paid.';
  if (status === 400) {
    if (context === 'catalog') return 'Unable to load services for this branch. Try again shortly.';
    if (context === 'payment') return 'The payment could not be recorded. Check the amount and payment details.';
    if (context === 'receipt') return 'The receipt could not be loaded. Try again shortly.';
    return 'The sale could not be created. Review the selected services and try again.';
  }
  if (context === 'catalog') return 'Unable to load services for this branch. Try again shortly.';
  if (context === 'payment') return 'Unable to record payment right now. Try again shortly.';
  if (context === 'receipt') return 'Unable to load the receipt right now. Try again shortly.';
  return 'Unable to complete the sale right now. Try again shortly.';
}