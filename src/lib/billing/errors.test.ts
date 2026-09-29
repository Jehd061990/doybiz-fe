import { getBillingErrorMessage } from './errors';

describe('billing safe error messages', () => {
  it.each([
    [401, 'Your session has expired. Sign in again.'],
    [403, 'Billing access is not available for your account.'],
    [404, 'This billing record could not be found in your organization.'],
    [500, 'Unable to load billing information. Try again shortly.'],
  ])('maps HTTP %s without exposing backend detail', (status, expected) => {
    expect(getBillingErrorMessage({ status, message: 'database stack trace' })).toBe(expected);
  });

  it('gives safe messages for adjustment and payment validation errors', () => {
    expect(getBillingErrorMessage({ status: 400, message: 'No additional billing is required for these organization additions' }, 'adjust'))
      .toBe('The selected additions do not require a billable adjustment.');
    expect(getBillingErrorMessage({ status: 400, message: 'XENDIT_SECRET_KEY is not configured' }, 'payment'))
      .toBe('A payment request could not be created. Try again or refresh the billing record.');
    expect(getBillingErrorMessage({ status: 400, message: 'Cannot activate subscription from CANCELLED status' }, 'activate'))
      .toBe('A prepaid subscription could not be started. Review the existing subscription and try again.');
  });
});