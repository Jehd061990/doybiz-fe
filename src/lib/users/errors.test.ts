import { getUserManagementErrorMessage } from './errors';

describe('user management error messages', () => {
  it('explains backend owner protection without exposing internal details', () => {
    expect(getUserManagementErrorMessage(
      { status: 400, message: 'The organization must retain at least one active owner' },
      'update',
    )).toBe('This user cannot be changed because the organization must retain an active owner.');
  });

  it.each([
    [401, 'Your session has expired. Sign in again.'],
    [403, 'Only an organization owner can manage users.'],
    [404, 'This user could not be found in your organization.'],
    [409, 'A user with this email already exists in your organization.'],
    [500, 'Unable to load organization users. Try again shortly.'],
  ])('maps HTTP %s to a safe message', (status, expected) => {
    expect(getUserManagementErrorMessage({ status, message: 'database stack trace' })).toBe(expected);
  });
});