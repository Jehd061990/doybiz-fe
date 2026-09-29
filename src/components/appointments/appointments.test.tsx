import { getAppointmentErrorMessage } from '@/lib/appointments/errors';

describe('Appointments module unit tests', () => {
  it('maps appointment errors correctly', () => {
    expect(getAppointmentErrorMessage({ status: 401 }, 'reservation')).toBe('Your session has expired. Sign in again.');
    expect(getAppointmentErrorMessage({ message: 'Staff member is already booked' }, 'reservation')).toBe('The selected staff member is already booked for this time slot.');
    expect(getAppointmentErrorMessage({ status: 404 }, 'service')).toBe('The requested service could not be found.');
    expect(getAppointmentErrorMessage({ status: 403 }, 'reservation')).toBe('You do not have access to perform this action.');
  });
});
