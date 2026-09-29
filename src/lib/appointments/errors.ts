interface AppointmentErrorLike {
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
  payload?: unknown;
}

export function getAppointmentErrorMessage(value: unknown, context: 'service' | 'reservation' = 'reservation') {
  const error = typeof value === 'object' && value !== null ? value as AppointmentErrorLike : {};
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
  if (status === 403) return 'You do not have access to perform this action.';
  if (status === 404) {
    return context === 'service'
      ? 'The requested service could not be found.'
      : 'The requested reservation could not be found.';
  }

  if (message.includes('staff member is already booked')) {
    return 'The selected staff member is already booked for this time slot.';
  }
  if (message.includes('staff member is not qualified or assigned')) {
    return 'The selected staff member is not assigned or qualified to perform this service.';
  }
  if (message.includes('branch not found') || message.includes('do not have access to this branch')) {
    return 'Choose an active branch available to your account.';
  }
  if (message.includes('customer not found')) return 'Selected customer could not be found or is inactive.';
  if (message.includes('service not found')) return 'Selected service could not be found or is inactive.';
  if (message.includes('staff member not found')) return 'Selected staff member could not be found or is inactive.';

  if (status === 400) {
    if (context === 'service') return 'Unable to save service. Check price, duration, and details.';
    return 'Unable to save reservation. Check schedule, staff assignment, and branch details.';
  }

  return context === 'service'
    ? 'Unable to complete service operation right now. Try again shortly.'
    : 'Unable to complete reservation operation right now. Try again shortly.';
}
