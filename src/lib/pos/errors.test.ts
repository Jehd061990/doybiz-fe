import { getPosErrorMessage } from './errors';

describe('POS safe errors', () => {
  it.each([
    [401, 'Your session has expired. Sign in again.'],
    [403, 'You do not have access to complete this POS action.'],
    [404, 'The requested sale could not be found in this organization.'],
    [500, 'Unable to complete the sale right now. Try again shortly.'],
  ])('maps HTTP %s without exposing backend details', (status, expected) => {
    expect(getPosErrorMessage({ status, message: 'MongoDB stack trace' })).toBe(expected);
  });

  it('uses safe branch, service, and payment messages', () => {
    expect(getPosErrorMessage({ status: 400, message: 'Branch not found or inactive' }, 'sale'))
      .toBe('Choose an active branch available to your account.');
    expect(getPosErrorMessage({ status: 400, message: 'Service is not available at the selected branch' }, 'catalog'))
      .toBe('One of the selected services is no longer available at this branch.');
    expect(getPosErrorMessage({ status: 400, message: 'Payment exceeds remaining balance of 20.00' }, 'payment'))
      .toBe('The payment could not be recorded. Check the amount and payment details.');
  });
});