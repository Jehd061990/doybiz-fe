import { getAppointmentErrorMessage } from './errors';

describe('appointment error mapping', () => {
  it('maps status codes and specific validation messages', () => {
    expect(getAppointmentErrorMessage({ status: 401 }, 'reservation')).toBe('Your session has expired. Sign in again.');
    expect(getAppointmentErrorMessage({ message: 'Staff member is already booked' }, 'reservation')).toBe('The selected staff member is already booked for this time slot.');
    expect(getAppointmentErrorMessage({ message: 'Staff member is not qualified or assigned to perform this service' }, 'reservation')).toBe('The selected staff member is not assigned or qualified to perform this service.');
    expect(getAppointmentErrorMessage({ status: 404 }, 'service')).toBe('The requested service could not be found.');
    expect(getAppointmentErrorMessage({ status: 400 }, 'service')).toBe('Unable to save service. Check price, duration, and details.');
  });
});
